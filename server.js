require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Replicate = require('replicate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { readFile } = require('fs/promises');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 and WAV files are allowed'));
    }
  }
});

// Helper function to wait for prediction completion
async function waitForPrediction(predictionId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const latest = await replicate.predictions.get(predictionId);
      console.log(`Prediction status (attempt ${i + 1}):`, latest.status);
      
      if (latest.status === "succeeded") {
        return latest;
      } else if (latest.status === "failed") {
        console.error('Prediction failed details:', latest.error);
        throw new Error(latest.error || "Prediction failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error checking prediction status (attempt ${i + 1}):`, error);
      throw error;
    }
  }
  throw new Error("Prediction timed out");
}

// Helper function to safely delete a file
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('File deleted successfully:', filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// Generate lyrics using ChatGPT
async function generateLyrics(description, mood, genre) {
  try {
    const prompt = `Create song lyrics based on this description: "${description}" in a ${mood} mood, ${genre} genre. 
    Format the lyrics with proper sections (verse, chorus, etc.) using newlines and double newlines for pauses.
    Keep the total length under 350 characters.`;

    console.log('Sending prompt to OpenAI:', prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    console.log('Received response from OpenAI');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating lyrics:', error);
    throw error;
  }
}

// Generate lyrics endpoint
app.post('/api/generate-lyrics', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    const { description, mood, genre } = req.body;

    if (!description) {
      throw new Error('Description is required');
    }

    // Generate lyrics using ChatGPT
    console.log('Generating lyrics for:', { description, mood, genre });
    const lyrics = await generateLyrics(description, mood, genre);
    console.log('Generated lyrics:', lyrics);

    res.json({
      success: true,
      lyrics: lyrics
    });
  } catch (error) {
    console.error('Error generating lyrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate lyrics'
    });
  }
});

// Generate music based on uploaded file and lyrics
app.post('/api/generate-music', upload.single('referenceSong'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    console.log('Received request:', {
      body: req.body,
      file: req.file,
      headers: req.headers
    });

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN is missing');
      throw new Error('REPLICATE_API_TOKEN is not set in environment variables');
    }

    const { lyrics } = req.body;

    if (!lyrics) {
      throw new Error('Lyrics are required');
    }

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    uploadedFilePath = req.file.path;

    // Read the file as a buffer
    const fileBuffer = await readFile(uploadedFilePath);
    console.log('File read as buffer, size:', fileBuffer.length);
    
    // Convert buffer to base64 string
    const base64String = fileBuffer.toString('base64');
    console.log('File converted to base64, length:', base64String.length);
    
    // Create the input object according to the model's requirements
    const input = {
      lyrics: lyrics,
      bitrate: 256000,
      sample_rate: 44100,
      song_file: `data:audio/mpeg;base64,${base64String}`,
      duration: 30,
      temperature: 0.8,
      top_k: 250,
      top_p: 0.95,
      classifier_free_guidance: 3,
      num_inference_steps: 50,
      guidance_scale: 7.5
    };

    console.log('Sending request to Replicate with input:', {
      ...input,
      song_file: `data:audio/mpeg;base64,[${base64String.length} characters]`
    });

    // Create the prediction
    const prediction = await replicate.predictions.create({
      model: "minimax/music-01",
      input
    });

    console.log('Prediction created:', prediction.id);

    // Wait for the prediction to complete
    const completed = await waitForPrediction(prediction.id);

    console.log('Music generation successful:', completed.output);
    
    res.json({
      success: true,
      track: completed.output
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate music',
      details: error.response?.data || 'No additional details available'
    });
  } finally {
    // Always clean up the uploaded file
    if (uploadedFilePath) {
      deleteFile(uploadedFilePath);
    }
  }
});

// Clean up uploads directory on server shutdown
process.on('SIGTERM', () => {
  const uploadDir = 'uploads';
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    console.log('Uploads directory cleaned up');
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('REPLICATE_API_TOKEN exists:', !!process.env.REPLICATE_API_TOKEN);
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
});
