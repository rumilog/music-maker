# AI Music Generator

An AI-powered music generation application that creates music based on user descriptions, moods, and reference songs.

## Features

- Generate lyrics using ChatGPT
- Edit generated lyrics
- Upload reference songs
- Generate music using the minimax/music-01 model
- Step-by-step interface for easy navigation

## Setup

1. Clone the repository:
```bash
git clone https://github.com/rumilog/music-gen.git
cd music-gen
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```
REPLICATE_API_TOKEN=your_replicate_token
OPENAI_API_KEY=your_openai_key
```

4. Start the application:
```bash
npm run dev:full
```

## Usage

1. Enter a description of your song
2. Select a mood and genre
3. Generate and edit lyrics
4. Upload a reference song
5. Generate the final music

## Technologies Used

- React
- Material-UI
- Express.js
- OpenAI API
- Replicate API
- minimax/music-01 model

## License

MIT 