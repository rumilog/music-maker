import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  CircularProgress,
  Alert,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';

const Input = styled('input')({
  display: 'none',
});

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function App() {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState('neutral');
  const [genre, setGenre] = useState('any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedTrack, setGeneratedTrack] = useState(null);
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [editedLyrics, setEditedLyrics] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [lyricsGenerated, setLyricsGenerated] = useState(false);

  const moods = ['neutral', 'happy', 'sad', 'energetic', 'calm', 'angry', 'romantic', 'mysterious'];
  const genres = ['any', 'pop', 'rock', 'jazz', 'classical', 'electronic', 'hip hop', 'folk', 'country'];

  const steps = ['Generate Lyrics', 'Edit Lyrics', 'Upload Reference Song', 'Generate Music'];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!description) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/generate-lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, mood, genre }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate lyrics');
      }

      setGeneratedLyrics(data.lyrics);
      setEditedLyrics(data.lyrics);
      setLyricsGenerated(true);
      setActiveStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!editedLyrics) {
      setError('Please enter lyrics');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('referenceSong', file);
      formData.append('lyrics', editedLyrics);

      const response = await fetch('http://localhost:5000/api/generate-music', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate music');
      }

      setGeneratedTrack(data.track);
      setActiveStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      handleGenerateLyrics();
    } else if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleGenerateMusic();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setGeneratedLyrics('');
    setEditedLyrics('');
    setGeneratedTrack(null);
    setLyricsGenerated(false);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Describe your song"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />

            <FormControl fullWidth>
              <InputLabel>Mood</InputLabel>
              <Select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                label="Mood"
                disabled={loading}
              >
                {moods.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Genre</InputLabel>
              <Select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                label="Genre"
                disabled={loading}
              >
                {genres.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={!description || loading}
            >
              {loading ? 'Generating Lyrics...' : 'Generate Lyrics'}
            </Button>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Edit Lyrics:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={editedLyrics}
              onChange={(e) => setEditedLyrics(e.target.value)}
              disabled={loading}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!editedLyrics || loading}
              >
                Next
              </Button>
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Reference Song:
            </Typography>
            <Box>
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  disabled={loading}
                >
                  Select Reference Song
                </Button>
                <VisuallyHiddenInput
                  id="file-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              {file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!file || loading}
              >
                Generate Music
              </Button>
            </Box>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {generatedTrack && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Generated Music:
                </Typography>
                <audio controls src={generatedTrack} style={{ width: '100%' }}>
                  Your browser does not support the audio element.
                </audio>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleReset}
                disabled={loading}
              >
                Start Over
              </Button>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          AI Music Generator
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {renderStepContent(activeStep)}
        </Paper>
      </Box>
    </Container>
  );
}

export default App; 