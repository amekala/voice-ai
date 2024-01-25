require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios'); // You will need to install the axios package
const FormData = require('form-data'); // You will need to install the form-data package
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use('/audio', express.static(path.join(__dirname, 'audio')));

app.use(cors({ origin: 'http://localhost:3000' }));

const openai = new OpenAI(process.env.OPENAI_API_KEY);

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Create an instance of FormData
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname); // Append file buffer and name
    formData.append('model', 'whisper-1'); // Append the model parameter

    // Set up OpenAI API request for transcription
    const transcriptionResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(), // formData.getHeaders() adds the correct Content-Type for multipart/form-data
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
    });

    // Log the transcription response to the console
    console.log(transcriptionResponse.data);

    // Send the transcribed text to the OpenAI Chat Completions API
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: transcriptionResponse.data.text }
      ]
    });

    // Extract the assistant's response
    const assistantMessage = chatResponse.choices[0].message.content;
    console.log(assistantMessage);

    // Send the assistant's response to the OpenAI Text-to-Speech API
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantMessage
    });

    // Write the TTS response to a file
    const speechFile = path.resolve('./speech.mp3');
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    // Log the TTS response to the console
    console.log(`TTS response written to ${speechFile}`);

    // Respond to the client with the TTS result
   // res.json({ message: `TTS response written to ${speechFile}` });
    res.json({ url: `http://localhost:8000/audio/speech.mp3` });

  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));