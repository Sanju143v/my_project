require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vaaniverse_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user store
const users = [];

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), name, email, password: hashedPassword };
    users.push(user);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== TRANSLATION API ====================

app.post('/api/translate', authMiddleware, async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }
    const langPair = `${sourceLang || 'en'}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.responseStatus === 200) {
      res.json({ translatedText: data.responseData.translatedText, status: 'success' });
    } else {
      res.json({ translatedText: data.responseData.translatedText || text, status: 'partial' });
    }
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: 'Translation service error' });
  }
});

// ==================== LYRICS GENERATION ====================

const lyricsTemplates = {
  romantic: {
    happy: [
      { type: 'verse1', lines: [
        "Every moment with you feels like sunshine",
        "Your smile lights up the darkest of my days",
        "I never knew love could feel so divine",
        "You set my heart ablaze in countless ways"
      ]},
      { type: 'chorus', lines: [
        "You are my everything, my heart's delight",
        "Together we shine brighter than the stars at night",
        "With every beat my heart sings out your name",
        "This love we share will never be the same"
      ]},
      { type: 'verse2', lines: [
        "Dancing through the rain with you beside me",
        "Every whisper turns into a melody",
        "Your laughter is the sweetest harmony",
        "A love like ours was always meant to be"
      ]},
      { type: 'chorus', lines: [
        "You are my everything, my heart's delight",
        "Together we shine brighter than the stars at night",
        "With every beat my heart sings out your name",
        "This love we share will never be the same"
      ]},
      { type: 'bridge', lines: [
        "Through the seasons changing all around",
        "In your arms is where I'm finally found",
        "No mountain high, no valley deep",
        "This promise is forever mine to keep"
      ]},
      { type: 'chorus', lines: [
        "You are my everything, my heart's delight",
        "Together we shine brighter than the stars at night",
        "With every beat my heart sings out your name",
        "This love we share will never be the same",
        "Oh, this love will never be the same..."
      ]}
    ],
    sad: [
      { type: 'verse1', lines: [
        "The echoes of your voice still haunt these walls",
        "I reach for you but find an empty space",
        "The photographs we took line empty halls",
        "I'm searching for the warmth of your embrace"
      ]},
      { type: 'chorus', lines: [
        "Where did our love go, tell me where it went",
        "Every word unsaid, every moment spent",
        "I'm drowning in the ocean of our memories",
        "A broken heart that's begging on its knees"
      ]},
      { type: 'verse2', lines: [
        "The seasons changed but I'm still standing here",
        "Holding onto shadows of the past",
        "Every song reminds me you were near",
        "I thought forever was designed to last"
      ]},
      { type: 'chorus', lines: [
        "Where did our love go, tell me where it went",
        "Every word unsaid, every moment spent",
        "I'm drowning in the ocean of our memories",
        "A broken heart that's begging on its knees"
      ]},
      { type: 'bridge', lines: [
        "Maybe tomorrow the sun will rise again",
        "Maybe this heartbreak will finally end",
        "But until then I'll hold you in my mind",
        "The greatest love I'll ever leave behind"
      ]},
      { type: 'chorus', lines: [
        "Where did our love go, tell me where it went",
        "Every word unsaid, every moment spent",
        "I'm drowning in the ocean of our memories",
        "A broken heart on bended knees...",
        "Still begging please... come back to me"
      ]}
    ]
  },
  pop: {
    happy: [
      { type: 'verse1', lines: [
        "Wake up in the morning feeling alive",
        "Got that rhythm pumping, ready to thrive",
        "Turn the music up and let it play",
        "Nothing's gonna bring me down today"
      ]},
      { type: 'prechorus', lines: [
        "Feel it in the air, electricity",
        "This is where I'm meant to be"
      ]},
      { type: 'chorus', lines: [
        "We're unstoppable tonight",
        "Chasing dreams under neon lights",
        "Hands up, let the music take control",
        "We're on fire, heart and soul"
      ]},
      { type: 'verse2', lines: [
        "City streets are glowing, feel the vibe",
        "Every heartbeat matching every stride",
        "Strangers turning into lifelong friends",
        "This is just the start, it never ends"
      ]},
      { type: 'prechorus', lines: [
        "Feel it in the air, electricity",
        "This is where I'm meant to be"
      ]},
      { type: 'chorus', lines: [
        "We're unstoppable tonight",
        "Chasing dreams under neon lights",
        "Hands up, let the music take control",
        "We're on fire, heart and soul"
      ]},
      { type: 'bridge', lines: [
        "Don't stop, don't stop, keep moving on",
        "The night is young before the dawn",
        "We'll dance until the morning light",
        "Everything is feeling right"
      ]},
      { type: 'chorus', lines: [
        "We're unstoppable tonight",
        "Chasing dreams under neon lights",
        "Hands up, let the music take control",
        "We're on fire, heart and soul",
        "Yeah we're on fire... heart and soul!"
      ]}
    ],
    sad: [
      { type: 'verse1', lines: [
        "Scrolling through the pictures on my phone",
        "Everything reminds me I'm alone",
        "The playlist we made still on repeat",
        "Every song sounds bitter without you here with me"
      ]},
      { type: 'chorus', lines: [
        "I can't pretend that I'm alright",
        "Lost in the static of another lonely night",
        "These four walls are closing in",
        "Wish I could go back to where we begin"
      ]},
      { type: 'verse2', lines: [
        "Coffee shop on fifth, our favorite place",
        "I still see the ghost of your face",
        "The barista asks where you've been",
        "I just smile and hold the tears within"
      ]},
      { type: 'chorus', lines: [
        "I can't pretend that I'm alright",
        "Lost in the static of another lonely night",
        "These four walls are closing in",
        "Wish I could go back to where we begin"
      ]},
      { type: 'bridge', lines: [
        "Maybe I'll learn to be okay",
        "Maybe the hurt will fade someday",
        "But right now in this silent room",
        "All I have is me and you... and memories"
      ]},
      { type: 'chorus', lines: [
        "I can't pretend that I'm alright",
        "Lost in the static of another lonely night",
        "These four walls keep closing in",
        "I wish that I could start again...",
        "I wish that we could start again..."
      ]}
    ]
  },
  hiphop: {
    energetic: [
      { type: 'verse1', lines: [
        "Step into the game with a fire in my soul",
        "Building up my empire, reaching every goal",
        "From the bottom to the top, never looking back",
        "Every obstacle I face, I stay on track",
        "Microphone in hand, commanding the stage",
        "Writing history on every page",
        "They said I couldn't but I proved them wrong",
        "Living proof that I've been strong all along"
      ]},
      { type: 'chorus', lines: [
        "Rise up, stand tall, we won't fall",
        "Breaking through every wall",
        "From the ground to the sky we fly",
        "VaaniVerse vibes running high"
      ]},
      { type: 'verse2', lines: [
        "City lights reflecting off the pavement cold",
        "Got a story and it needs to be told",
        "Every rhyme I write is straight from the heart",
        "Been a leader from the very start",
        "Stack the bars like bricks building up a tower",
        "Every second, every minute, every hour",
        "Dedication running through my veins",
        "Through the sunshine and the pouring rains"
      ]},
      { type: 'chorus', lines: [
        "Rise up, stand tall, we won't fall",
        "Breaking through every wall",
        "From the ground to the sky we fly",
        "VaaniVerse vibes running high"
      ]},
      { type: 'bridge', lines: [
        "Yo, this is for the dreamers and the believers",
        "The go-getters and the achievers",
        "Put your hands up if you feel the vibe",
        "We're alive, we survive, we thrive"
      ]},
      { type: 'outro', lines: [
        "Rise up... stand tall...",
        "We won't fall... breaking every wall...",
        "VaaniVerse... yeah..."
      ]}
    ],
    sad: [
      { type: 'verse1', lines: [
        "Late nights staring at the ceiling above",
        "Thinking bout the ones I used to love",
        "Empty bottles on the table side",
        "Too many feelings that I try to hide",
        "Mama told me life ain't always fair",
        "But she never said nobody'd care",
        "Walking through the city all alone",
        "Trying to find my way back home"
      ]},
      { type: 'chorus', lines: [
        "Sometimes the weight is hard to bear",
        "Looking around and nobody's there",
        "But I keep pushing through the pain",
        "Sunshine always follows rain"
      ]},
      { type: 'verse2', lines: [
        "Scars tell stories that words never could",
        "I'd change the past if I only could",
        "But every struggle made me who I am",
        "From a whisper to a roaring slam",
        "They don't see the tears behind the smile",
        "Been walking down this lonely mile",
        "But even in the darkest night",
        "I'll be my own guiding light"
      ]},
      { type: 'chorus', lines: [
        "Sometimes the weight is hard to bear",
        "Looking around and nobody's there",
        "But I keep pushing through the pain",
        "Sunshine always follows rain"
      ]},
      { type: 'outro', lines: [
        "Yeah... sunshine follows rain...",
        "Keep pushing... keep breathing...",
        "We'll be alright..."
      ]}
    ]
  },
  rock: {
    energetic: [
      { type: 'verse1', lines: [
        "Thunder rolling, feel it in my bones",
        "Electric current through these microphones",
        "The crowd is screaming, louder than before",
        "We came to rock and we want more"
      ]},
      { type: 'chorus', lines: [
        "Set it on fire, burn it down",
        "We're the kings of this forgotten town",
        "Guitars blazing, drums alive",
        "This is how legends survive"
      ]},
      { type: 'verse2', lines: [
        "Rebel hearts beating to the drum",
        "We won't stop until the job is done",
        "Scream it out let the whole world hear",
        "We are here, we have no fear"
      ]},
      { type: 'chorus', lines: [
        "Set it on fire, burn it down",
        "We're the kings of this forgotten town",
        "Guitars blazing, drums alive",
        "This is how legends survive"
      ]},
      { type: 'bridge', lines: [
        "So raise your fists up to the sky",
        "We were born, born to fly",
        "Nothing can hold us down tonight",
        "We are the fire, we are the light"
      ]},
      { type: 'chorus', lines: [
        "Set it on fire, burn it down",
        "We're the kings of this forgotten town",
        "Guitars blazing, drums alive",
        "This is how legends survive!",
        "This is how we stay alive!"
      ]}
    ],
    melancholic: [
      { type: 'verse1', lines: [
        "Broken strings on an old guitar",
        "Whiskey glass in a smoky bar",
        "The jukebox plays our favorite song",
        "I'm still here but you've been gone so long"
      ]},
      { type: 'chorus', lines: [
        "Fade to black, the curtain falls",
        "Nothing left but these four walls",
        "A melody that used to shine",
        "Now echoes down this empty spine"
      ]},
      { type: 'verse2', lines: [
        "Leather jacket hanging by the door",
        "Still smells like the dreams we wore",
        "The road we shared now forks in two",
        "Every mile still leads to you"
      ]},
      { type: 'chorus', lines: [
        "Fade to black, the curtain falls",
        "Nothing left but these four walls",
        "A melody that used to shine",
        "Now echoes down this empty spine"
      ]},
      { type: 'bridge', lines: [
        "One more night beneath the pale moonlight",
        "One more song to make it feel alright",
        "The ashes of what used to burn so bright",
        "Still glow in the darkness of the night"
      ]},
      { type: 'outro', lines: [
        "Fade to black... the curtain falls...",
        "These empty walls... remember it all...",
        "Remember it all..."
      ]}
    ]
  },
  classical: {
    peaceful: [
      { type: 'verse1', lines: [
        "In gardens where the morning dew descends",
        "Where golden sunlight through the willow bends",
        "A symphony of nature softly plays",
        "Through endless meadows and enchanted ways"
      ]},
      { type: 'chorus', lines: [
        "Eternal beauty whispers through the trees",
        "A gentle song carried by the breeze",
        "In harmony with earth and sky above",
        "A timeless ode to everlasting love"
      ]},
      { type: 'verse2', lines: [
        "The river flows with tales of ancient days",
        "Through marble halls and moonlit waterways",
        "Each note a pearl upon a silver thread",
        "Where angels walk and poets dare to tread"
      ]},
      { type: 'chorus', lines: [
        "Eternal beauty whispers through the trees",
        "A gentle song carried by the breeze",
        "In harmony with earth and sky above",
        "A timeless ode to everlasting love"
      ]},
      { type: 'bridge', lines: [
        "Let the orchestra of life resound",
        "In every heartbeat, beauty can be found",
        "From dawn to dusk, from spring to winter's end",
        "A masterpiece that time can never rend"
      ]},
      { type: 'finale', lines: [
        "Eternal beauty whispers through the trees",
        "A gentle song carried by the breeze",
        "In harmony with earth and sky above",
        "Forever bound by everlasting love",
        "A timeless symphony... of love..."
      ]}
    ]
  },
  folk: {
    nostalgic: [
      { type: 'verse1', lines: [
        "Down by the river where the willows grow",
        "Where the water runs crystal and the wild winds blow",
        "Grandma used to sing me songs of old",
        "Stories wrapped in silver and gold"
      ]},
      { type: 'chorus', lines: [
        "Take me back to simpler days",
        "Dirt road memories and country ways",
        "Fireflies dancing in the summer night",
        "Everything was pure, everything was right"
      ]},
      { type: 'verse2', lines: [
        "Wooden porch and an old rocking chair",
        "Honeysuckle sweetness in the evening air",
        "Daddy played the fiddle while mama sang along",
        "Every day felt like a brand new song"
      ]},
      { type: 'chorus', lines: [
        "Take me back to simpler days",
        "Dirt road memories and country ways",
        "Fireflies dancing in the summer night",
        "Everything was pure, everything was right"
      ]},
      { type: 'bridge', lines: [
        "Years have passed like leaves upon the stream",
        "But I still hold tight to that old dream",
        "Where laughter echoed through the hollow pines",
        "And love was homemade like the muscadine wine"
      ]},
      { type: 'chorus', lines: [
        "Take me back to simpler days",
        "Dirt road memories and country ways",
        "Fireflies dancing in the summer night",
        "Take me back... take me home tonight..."
      ]}
    ]
  }
};

// Generic lyrics generator for any genre/mood combination not in templates
function generateGenericLyrics(genre, mood, theme) {
  const themeWords = theme ? theme.split(' ') : ['life', 'dreams'];
  const mainTheme = themeWords[0] || 'life';
  
  return [
    { type: 'verse1', lines: [
      `In the rhythm of ${genre}, I find my way`,
      `A ${mood} melody to start the day`,
      `${mainTheme.charAt(0).toUpperCase() + mainTheme.slice(1)} unfolds like pages in a book`,
      `Every corner turned, a brand new look`
    ]},
    { type: 'chorus', lines: [
      `Feel the ${mood} vibes flowing through`,
      `Every word I sing rings clear and true`,
      `${genre.charAt(0).toUpperCase() + genre.slice(1)} beats echo in the night`,
      `Chasing ${mainTheme} with all my might`
    ]},
    { type: 'verse2', lines: [
      `Through the highs and lows we carry on`,
      `Even when it seems the hope is gone`,
      `The music speaks what words cannot say`,
      `Guiding us through each and every day`
    ]},
    { type: 'chorus', lines: [
      `Feel the ${mood} vibes flowing through`,
      `Every word I sing rings clear and true`,
      `${genre.charAt(0).toUpperCase() + genre.slice(1)} beats echo in the night`,
      `Chasing ${mainTheme} with all my might`
    ]},
    { type: 'bridge', lines: [
      `Break free from the chains that hold us down`,
      `Rise above the noise of this old town`,
      `Together strong, united we stand`,
      `With ${mainTheme} and music hand in hand`
    ]},
    { type: 'chorus', lines: [
      `Feel the ${mood} vibes flowing through`,
      `Every word I sing rings clear and true`,
      `${genre.charAt(0).toUpperCase() + genre.slice(1)} beats echo in the night`,
      `Chasing ${mainTheme}... with all my might...`,
      `Yeah, with all my might...`
    ]}
  ];
}

app.post('/api/lyrics/generate', authMiddleware, (req, res) => {
  try {
    const { genre, mood, theme, tempo } = req.body;
    if (!genre || !mood) {
      return res.status(400).json({ error: 'Genre and mood are required' });
    }
    
    const genreLower = genre.toLowerCase();
    const moodLower = mood.toLowerCase();
    
    let lyrics;
    if (lyricsTemplates[genreLower] && lyricsTemplates[genreLower][moodLower]) {
      lyrics = lyricsTemplates[genreLower][moodLower];
    } else if (lyricsTemplates[genreLower]) {
      const moods = Object.keys(lyricsTemplates[genreLower]);
      lyrics = lyricsTemplates[genreLower][moods[0]];
    } else {
      lyrics = generateGenericLyrics(genreLower, moodLower, theme);
    }
    
    // Format lyrics
    let formattedLyrics = '';
    lyrics.forEach(section => {
      const sectionName = section.type.replace(/[0-9]/g, '').toUpperCase();
      formattedLyrics += `[${sectionName}]\n`;
      section.lines.forEach(line => {
        formattedLyrics += line + '\n';
      });
      formattedLyrics += '\n';
    });
    
    res.json({
      lyrics: formattedLyrics.trim(),
      metadata: { genre, mood, theme: theme || 'general', tempo: tempo || 'moderate' }
    });
  } catch (err) {
    console.error('Lyrics generation error:', err);
    res.status(500).json({ error: 'Lyrics generation failed' });
  }
});

// ==================== MUSIC GENERATION DATA ====================

// Musical scale definitions for procedural music generation
const scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10]
};

const genreConfig = {
  classical: { scale: 'major', tempo: 90, baseNote: 60, pattern: 'arpeggiated' },
  hiphop: { scale: 'pentatonic', tempo: 85, baseNote: 48, pattern: 'rhythmic' },
  pop: { scale: 'major', tempo: 120, baseNote: 60, pattern: 'melodic' },
  rock: { scale: 'minor', tempo: 130, baseNote: 52, pattern: 'power' },
  jazz: { scale: 'dorian', tempo: 100, baseNote: 55, pattern: 'swing' },
  electronic: { scale: 'minor', tempo: 128, baseNote: 48, pattern: 'arpeggio' },
  folk: { scale: 'major', tempo: 95, baseNote: 60, pattern: 'fingerpick' },
  rnb: { scale: 'pentatonic', tempo: 75, baseNote: 55, pattern: 'smooth' },
  blues: { scale: 'blues', tempo: 80, baseNote: 48, pattern: 'shuffle' },
  ambient: { scale: 'pentatonic', tempo: 60, baseNote: 60, pattern: 'pad' }
};

app.post('/api/music/config', authMiddleware, (req, res) => {
  const { genre, type } = req.body;
  const genreLower = (genre || 'pop').toLowerCase();
  const config = genreConfig[genreLower] || genreConfig.pop;
  const scale = scales[config.scale] || scales.major;
  
  // Generate a sequence of notes
  const noteCount = 32;
  const notes = [];
  let prevIndex = 0;
  
  for (let i = 0; i < noteCount; i++) {
    const jump = Math.floor(Math.random() * 3) - 1;
    prevIndex = Math.max(0, Math.min(scale.length - 1, prevIndex + jump));
    const octaveShift = Math.random() > 0.8 ? 12 : 0;
    notes.push({
      midi: config.baseNote + scale[prevIndex] + octaveShift,
      duration: [0.25, 0.5, 0.5, 1][Math.floor(Math.random() * 4)],
      velocity: 0.5 + Math.random() * 0.5
    });
  }
  
  res.json({
    notes,
    tempo: config.tempo,
    scale: config.scale,
    genre: genreLower,
    type: type || 'default'
  });
});

// ==================== SERVE SPA ====================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🎙️  VaaniVerse Server Running         ║
  ║   📡  http://localhost:${PORT}              ║
  ║   🚀  Ready for connections              ║
  ╚══════════════════════════════════════════╝
  `);
});
