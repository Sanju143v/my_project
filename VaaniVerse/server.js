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

// ==================== STORY GENERATION ====================

const storyTemplates = {
  kids: {
    adventure: {
      title: "The Brave Little Explorer",
      story: `Once upon a time, in a tiny village nestled between candy-colored mountains, there lived a curious little rabbit named Pip. 🐰

Pip loved exploring! Every morning, he'd put on his tiny red backpack and set off on a new adventure.

One sunny day, Pip discovered a sparkling trail of golden footprints leading into the Whispering Woods. "Wow!" said Pip, his ears perking up with excitement.

He followed the trail past the Giggling Stream (it really did giggle — "hee hee hee!"), through the Ticklish Grass (it wiggled under his paws!), and all the way to a magnificent tree house made entirely of chocolate chip cookies! 🍪

"Welcome, brave explorer!" said a friendly owl named Professor Hoot, wearing tiny spectacles. "You've found the Secret Library of Stories!"

Inside, the shelves were filled with books that glowed in every color of the rainbow. When you opened them, the pictures came alive and danced around the room!

"Every story needs a brave reader," said Professor Hoot. "Would you like to be the hero of your very own tale?"

Pip nodded so hard his ears flapped. And from that day on, Pip and Professor Hoot shared the most wonderful adventures — because the best stories are the ones we live ourselves! ✨

THE END 🌟

Moral: Be curious, be brave, and wonderful adventures will find you!`
    },
    moral: {
      title: "The Kind Little Star",
      story: `High up in the night sky, there lived a small star named Twinkle. ⭐

Unlike the other big, bright stars, Twinkle was very, very tiny. The other stars would sometimes say, "You're too small to shine!"

This made Twinkle sad. But every night, she tried her very best to glow as brightly as she could.

One dark, cloudy night, a little girl named Maya was lost in the park. She couldn't find her way home, and she was very scared. 😢

"I wish I could see a star to guide me," Maya whispered.

All the big stars were hidden behind the thick clouds. But tiny Twinkle was so small, she could peek through the tiniest gap between the clouds!

"I may be small, but I can still help!" said Twinkle. She gathered all her energy and — FLASH! — she sent her brightest sparkle right through the gap!

Maya looked up and saw the little light. "A star! Thank you, little star!" She followed Twinkle's light all the way home. 🏠

From that day on, everyone in the sky knew that being small doesn't mean you can't make a BIG difference.

THE END 🌙

Moral: No matter how small you are, you can always make a big difference with a kind heart!`
    },
    funny: {
      title: "The Dragon Who Couldn't Breathe Fire",
      story: `In the land of Dragonville, every dragon could breathe fire. Every dragon except... Dave. 🐲

Dave was a big green dragon with sparkly scales and a wonderful smile. But whenever he tried to breathe fire, he'd sneeze out... BUBBLES! 🫧

"ACHOO!" — bubbles everywhere!

The other dragons would laugh. "Dave the Bubble Dragon!" they teased.

Dave felt embarrassed. He went to see Dr. Scales, the dragon doctor.

"Hmm," said Dr. Scales, checking Dave's throat. "Everything looks fine. You're just... different. And different isn't bad!"

One day, a terrible thing happened. The Dragon School caught fire! 🔥 (Ironic, right?)

The young dragon students were trapped inside! The fire-breathing dragons tried to help, but their fire only made things worse!

Then Dave had an idea. "ACHOO! ACHOO! ACHOO!" He sneezed the biggest, most gigantic bubbles anyone had ever seen! The bubbles floated over the flames and — POP! POP! POP! — put out the fire with soapy water!

The students were saved! Everyone cheered for Dave!

From that day on, Dave became the official Fire Safety Dragon of Dragonville. And he never felt embarrassed about his bubbles again! 🎉

THE END 🫧

Moral: What makes you different makes you special!`
    }
  },
  adults: {
    adventure: {
      title: "The Last Cartographer",
      story: `Elena traced her finger along the edge of the old map, feeling the raised ink beneath her fingertip. The map had been her grandmother's — a woman who had spent sixty years charting territories that no satellite had ever photographed.

"There's still one place left," her grandmother had whispered from her hospital bed, pressing a folded paper into Elena's palm. "The valley between two unnamed rivers in northern Bhutan. I ran out of time."

Elena was a data analyst. She lived in spreadsheets and quarterly reports. Adventures were something that happened to other people — braver, younger, more interesting people.

But standing in her grandmother's empty apartment, surrounded by maps that covered every wall like wallpaper, Elena felt something shift inside her. These weren't just maps. They were love letters to the world, each contour line drawn with the patience of someone who believed that knowing a place — truly knowing it — was a form of devotion.

Three months later, Elena stood at the edge of a valley that existed on no map, digital or otherwise. The river below was the color of jade, and the mountains rose like ancient sentinels on either side.

She pulled out her grandmother's compass — an analog relic in a GPS world — and began to sketch. Not because the world needed another map, but because some things deserve to be witnessed by someone willing to look carefully.

The cartography was imperfect. Her lines wobbled where her grandmother's would have been precise. But in the margins, Elena did something her grandmother never had: she wrote what the place felt like. The way the morning fog tasted of pine. The sound the river made at dusk, like a whispered conversation in a language she almost understood.

When she returned home, Elena hung the finished map on the wall of her apartment — one single map among bare walls. It was enough. Some people fill their walls with the whole world. Elena had found that one place, mapped with trembling hands and an open heart, was more than enough.

Below the map, she wrote: "For Grandmother — who taught me that the best journeys are the ones that change the cartographer."

THE END`
    },
    drama: {
      title: "The Weight of Unspoken Words",
      story: `The coffee had gone cold forty minutes ago, but neither of them had noticed.

Arjun sat across from his father in the hospital cafeteria, two men separated by a plastic table and thirty years of conversations they'd never had. His father's diagnosis — stage three — hung between them like smoke.

"The doctor says six months," his father said, stirring his cold coffee out of habit, not necessity.

"We'll get second opinions. There are clinical trials—"

"Arjun." His father's voice was quiet but firm. The same voice that had told him to study harder, stand straighter, be better. "I didn't ask you here to discuss treatment options."

The cafeteria hummed with the ambient grief of a hundred other families. Somewhere, a child was crying. Arjun waited.

"I was not a good father," his father said.

The sentence landed like a stone in still water. Arjun had imagined hearing those words a thousand times — in therapy sessions, in arguments with his wife, in the quiet moments before sleep. He had rehearsed responses: angry ones, gracious ones, devastating ones.

But now, sitting across from a man who looked smaller than he remembered, Arjun found that none of those rehearsed responses fit.

"You were the father you knew how to be," Arjun said. And was surprised to find he meant it.

His father looked up. His eyes — the same deep brown as Arjun's own — were wet.

"I wanted to say I'm proud of you. I should have said it years ago. Decades ago."

"I know." And somehow, impossibly, he did know. He had always known.

They sat in silence after that, but it was a different kind of silence. Not the heavy, suffocating silence of unspoken truths, but the gentle silence of two people who have finally said enough.

Arjun picked up his father's cold coffee and walked to the counter for a fresh cup. It was a small thing — perhaps the smallest thing. But sometimes the smallest things are the only ones that matter.

THE END`
    },
    mystery: {
      title: "The Appointment at 3 AM",
      story: `Dr. Nisha Sharma had received exactly one thousand, two hundred, and forty-seven emails since joining St. Andrews Hospital as a psychiatrist. She remembered the exact count because the one thousand, two hundred, and forty-eighth was the only one with no sender address.

Subject: "I know what happened in Room 714."

Room 714. The room had been sealed for eleven years, ever since a patient named Thomas Gray had vanished from it without a trace. No open windows, no forced locks, security cameras showing an empty corridor all night. Thomas Gray simply ceased to exist.

The email contained only a time: 3:00 AM. And a date: tonight.

Nisha was a rational woman. She believed in evidence, in diagnosis, in the elegant architecture of the human mind. She did not believe in ghosts, mysteries, or unsigned emails.

At 2:47 AM, she found herself standing outside Room 714 with a master key she'd borrowed from security under false pretenses.

The room was exactly as it had been abandoned. A bed, still made. A water glass, still half full — though the water had long since evaporated, leaving a white mineral ring. And on the bedside table, a journal.

She opened it. Thomas Gray's handwriting was meticulous, almost architectural. The entries were mundane at first — meals eaten, books read, therapy notes. But on the last page, dated the night of his disappearance, a single line:

"She will come looking. Tell her to check beneath the floor."

Nisha's hands trembled. She knelt. The floorboard beneath the bed was loose. Under it, a sealed envelope addressed to: "The Psychiatrist Who Replaced Me."

Inside: a resignation letter from Dr. Thomas Gray — not a patient at all, but the hospital's former chief psychiatrist who had admitted himself under a false name. And a USB drive containing evidence that the hospital's board had been falsifying patient records for insurance fraud.

Thomas Gray hadn't vanished. He had simply walked out the front door, transformed from patient back to doctor, and disappeared into a new life, leaving the truth buried for someone curious enough to dig.

Nisha stared at the drive in her hand. The email, she realized, was from the same automated system Thomas had set up eleven years ago — a dead man's switch, designed to trigger if the fraud was never exposed.

She had a choice to make. The same choice Thomas had made, and unmade, and made again.

At 3:17 AM, Dr. Nisha Sharma did something unusual. She made a phone call to a journalist she'd met at a conference. "I have a story for you," she said. "And you're going to want to sit down."

THE END`
    }
  },
  seniors: {
    wisdom: {
      title: "The Garden of Second Chances",
      story: `Lakshmi Devi had tended her garden for forty-three years, ever since she and her late husband Ramesh had moved into the house on Jacaranda Lane. She knew every plant the way a mother knows her children — their moods, their needs, their stubborn refusals to bloom in certain seasons.

At seventy-eight, her knees protested the kneeling, and her back had long since abandoned the flexibility required for proper weeding. But every morning at six, she was out there, coffee in one hand, pruning shears in the other, having the same conversation with the same roses.

"You're being dramatic again," she told the yellow rose bush that had been threatening to die since 2019. "You said this last year, and the year before. Bloom or don't bloom, but stop being theatrical about it."

The yellow roses, chastened, usually bloomed by March.

It was her neighbor's grandson, Aarav — twenty-two and recently heartbroken — who changed things. He appeared at her fence one morning looking like a plant that hadn't been watered in weeks.

"Aunty, my girlfriend left me," he said, as though announcing a natural disaster.

Lakshmi considered him. "Come inside. Help me repot the jasmine."

For the next two hours, they worked in silence. Aarav had surprisingly gentle hands for someone who spent most of his time on a computer. He held the root balls with the tenderness of someone who understood fragile things.

"The thing about plants," Lakshmi said, pressing soil around a transplanted jasmine, "is that they don't grow by holding on. They grow by letting go. Every autumn, they release their leaves. Every spring, they start again. They don't sit around mourning last year's flowers."

"That's different. Plants don't have feelings."

"Don't they? This jasmine — I transplanted it from my mother's garden in Mysore, fifty years ago. It nearly died on the train journey. I cried over it for a week. Then I stopped crying and started composting. And look at it now."

Aarav looked at the abundant jasmine cascading over the trellis. It was magnificent.

"Life is very long, my boy," Lakshmi said, patting his hand with soil-stained fingers. "Long enough for many gardens. You've only just started planting."

Aarav came back the next Saturday. And the Saturday after that. By summer, Lakshmi's garden had never looked better — she had acquired both a helper and a student. And Aarav had acquired something he didn't know he needed: the patience to wait for things to bloom.

THE END`
    },
    nostalgia: {
      title: "The Letters in the Attic",
      story: `When Suresh moved to a smaller flat after retirement, his daughter Meera helped him sort through the attic. Between tax returns from 1987 and a box of cassette tapes, they found a bundle of letters tied with kitchen string.

"What are these, Papa?"

Suresh held the bundle with the careful reverence of someone handling something infinitely precious. "These are from your mother. Before we were married."

Meera had known her parents' marriage as a quiet, steady thing — morning tea shared in comfortable silence, synchronized routines polished by decades. She had never imagined it had a beginning that required letters.

She asked if she could read them. Suresh hesitated, then nodded.

Her mother's handwriting was rounder than Meera remembered — younger, somehow, the letters not yet compressed by years of grocery lists and school permission slips.

"Dear Suresh," the first letter began. "I know we have only met twice, and both times I was too nervous to eat the samosa your mother offered. Please tell her the samosas were wonderful. I was simply overwhelmed by the company."

Meera smiled. Her mother, who had later become famous for her fearless opinions at family gatherings, had once been too nervous to eat a samosa.

The letters traced a courtship conducted across cities — Suresh in Bangalore, her mother in Pune. They discussed books. They argued about cricket. They confessed small, human anxieties: Would they be compatible? Would love grow from an arrangement? Was it foolish to hope?

"I have decided to hope," her mother wrote in the seventh letter. "Hope seems foolish only to people who have never tried it. I am choosing to be brave rather than sensible. Sensible is overrated."

The last letter was dated one week before the wedding. "Dear Suresh, I am terrified. But I am also certain. These two feelings, I have decided, are not contradictions. They are directions. I will follow both and trust where they lead."

They had led to forty-one years of marriage, three children, one garden, and a thousand cups of morning tea.

Meera carefully retied the letters and placed them in the box she was taking to the new flat. Not the storage box. The "keep close" box.

"Papa," she said, "I never knew Amma was so eloquent."

Suresh smiled — the distant, soft smile of a man remembering. "Your mother," he said, "was the most extraordinary person I have ever known. I was simply the lucky fool she chose to write letters to."

THE END`
    },
    reflections: {
      title: "What the River Taught Me",
      story: `Professor K.R. Murthy sat on the bench by the Kaveri river, the same bench where he had sat every evening for thirty years. The river had changed course slightly over those decades — moving a few feet east, as rivers do, slowly and without announcement.

He thought about this often: how change, when it happens gradually enough, becomes invisible. His students — he had taught physics for forty years — always wanted to understand change as an event. A sudden force. An impact. Newton's apple.

But the river taught a different physics. Change as patience. Change as repetition. Change as ten thousand small, unremarkable moments that, viewed from a distance, reveal themselves as transformation.

At eighty-two, Murthy had undergone his own slow transformation. The professor who had once filled lecture halls with booming demonstrations of electromagnetic force now spoke softly and sparingly. Not from weakness, but from the growing conviction that most important things are said quietly, or not at all.

His former student, now a professor herself, had called that morning. "Sir, the university wants to name the physics building after you."

"After me? Why?"

"Because you taught three generations of physicists, sir."

"I taught physics. The students taught themselves. I simply pointed at things and said 'look.'"

She laughed. "That's exactly why they want to name the building after you."

Murthy watched the river. A kingfisher — blue as an equation solved perfectly — dove into the water and emerged victorious, a silver fish glinting in the last light.

He thought about what he would want inscribed on a building, if he had the choice. Not his name. Perhaps just a question — the same question he had asked at the start of every first lecture for forty years:

"What do you notice?"

Because that, in the end, was all physics ever was. All teaching ever was. All living ever was. The discipline of noticing. The courage to look carefully at the world and describe, as honestly as you can, what you see.

The river flowed on. The kingfisher dove again. Evening settled over the water like a familiar story, told for the ten thousandth time, still beautiful, still true.

THE END`
    }
  }
};

app.post('/api/story/generate', authMiddleware, (req, res) => {
  try {
    const { ageGroup, genre } = req.body;
    if (!ageGroup) return res.status(400).json({ error: 'Age group is required' });
    const ag = ageGroup.toLowerCase();
    const g = (genre || '').toLowerCase();
    const templates = storyTemplates[ag];
    if (!templates) {
      return res.status(400).json({ error: 'Invalid age group. Use kids, adults, or seniors.' });
    }
    let story;
    if (templates[g]) {
      story = templates[g];
    } else {
      const keys = Object.keys(templates);
      story = templates[keys[Math.floor(Math.random() * keys.length)]];
    }
    res.json({ title: story.title, story: story.story, ageGroup: ag, genre: g || 'random' });
  } catch (err) {
    console.error('Story generation error:', err);
    res.status(500).json({ error: 'Story generation failed' });
  }
});

// ==================== PODCAST GENERATION ====================

const podcastTemplates = {
  technology: {
    2: [
      { speaker: 1, text: "Welcome to the show! Today we're diving deep into something that's on everyone's mind — Artificial Intelligence and its impact on everyday life." },
      { speaker: 2, text: "Thanks for having me. You know, I think what's fascinating about AI right now is that we've moved past the hype phase. People are actually using these tools daily." },
      { speaker: 1, text: "Exactly. I was reading a report that said over sixty percent of professionals use some form of AI assistance in their workflow now. That's massive." },
      { speaker: 2, text: "And it's not just tech workers. Doctors, lawyers, teachers — everyone's finding applications. The question is no longer 'will AI change my job' but 'how do I best work alongside it.'" },
      { speaker: 1, text: "What's your take on the concerns though? Job displacement, privacy issues, the whole ethical dimension?" },
      { speaker: 2, text: "Valid concerns, all of them. But I think history shows us that technology creates more opportunities than it eliminates. The key is adaptation and education." },
      { speaker: 1, text: "I couldn't agree more. The firms that are investing in upskilling their workforce are seeing tremendous returns. It's not about replacement, it's about augmentation." },
      { speaker: 2, text: "Well said. And the creativity aspect — AI is actually freeing people to focus on the uniquely human parts of their work. Strategy, empathy, relationship building." },
      { speaker: 1, text: "Great insights as always. Before we wrap up, any predictions for the next year?" },
      { speaker: 2, text: "I think we'll see AI become invisible — embedded into everything so seamlessly that we stop calling it AI and just call it how things work." },
      { speaker: 1, text: "Fascinating. Thank you for joining us today. And to our listeners, keep innovating, keep questioning, and we'll see you in the next episode." }
    ],
    3: [
      { speaker: 1, text: "Welcome everyone to Tech Forward! I'm your host, and today I have two brilliant minds joining me to discuss the future of technology." },
      { speaker: 2, text: "Great to be here. I've been looking forward to this conversation." },
      { speaker: 3, text: "Same here. These discussions always push my thinking in new directions." },
      { speaker: 1, text: "Let's jump right in. What technology trend do you think is most underrated right now?" },
      { speaker: 2, text: "For me, it's edge computing. Everyone's focused on cloud and AI, but the real revolution is happening at the edge — processing data right where it's generated." },
      { speaker: 3, text: "Interesting. I'd actually say quantum computing. We're closer to practical quantum advantage than most people realize. Within five years, we'll see it solving real-world problems." },
      { speaker: 1, text: "Both excellent points. How do you see these technologies intersecting?" },
      { speaker: 2, text: "That's the exciting part. Imagine edge devices with quantum processing capabilities. Real-time analysis of complex systems — traffic, weather, medical diagnostics — all happening instantly." },
      { speaker: 3, text: "And the security implications are enormous. Quantum encryption at the edge would fundamentally change cybersecurity." },
      { speaker: 1, text: "What about accessibility? These sound like technologies for big companies with big budgets." },
      { speaker: 3, text: "Initially, yes. But the democratization of technology always follows. Cloud computing was enterprise-only fifteen years ago. Now it's in every startup." },
      { speaker: 2, text: "Agreed. The tools will become more accessible. Open-source communities are already working on making quantum development approachable for regular developers." },
      { speaker: 1, text: "Wonderful discussion. Thank you both for sharing your expertise. Until next time, keep pushing the boundaries of what's possible." }
    ]
  },
  business: {
    2: [
      { speaker: 1, text: "Welcome to Business Insights. Today we're exploring what makes companies not just successful, but truly enduring." },
      { speaker: 2, text: "You know, I've studied dozens of companies that have lasted over a century, and there's a common thread — they all prioritize culture over strategy." },
      { speaker: 1, text: "That's counterintuitive. Most business schools teach strategy first." },
      { speaker: 2, text: "Strategy is important, don't get me wrong. But strategy can be copied. Culture cannot. It's your ultimate moat." },
      { speaker: 1, text: "Can you give us an example?" },
      { speaker: 2, text: "Look at companies like Toyota. Their production system — people have tried to copy it for decades. But it's not about the system, it's about the culture of continuous improvement that makes the system work." },
      { speaker: 1, text: "That's a powerful insight. What about startups? Can they build strong culture from day one?" },
      { speaker: 2, text: "Absolutely. In fact, it's easier to build culture from scratch than to change an existing one. The founders' values become the organization's DNA." },
      { speaker: 1, text: "Any practical advice for our listeners who are building their own companies?" },
      { speaker: 2, text: "Three things. First, define your values before you define your product. Second, hire for culture add, not just culture fit. Third, be consistent — culture is what you do when nobody's watching." },
      { speaker: 1, text: "Brilliant advice. Thank you for sharing your wisdom with us today." }
    ],
    3: [
      { speaker: 1, text: "Good morning and welcome to Business Roundtable. We have two incredibly accomplished entrepreneurs with us today." },
      { speaker: 2, text: "Thank you. Excited to share some hard-won lessons." },
      { speaker: 3, text: "Likewise. The best learning comes from conversations like these." },
      { speaker: 1, text: "Let's start with the elephant in the room — failure. Both of you have had spectacular failures before your successes. How did those shape you?" },
      { speaker: 2, text: "My first company went bankrupt in eighteen months. I lost everything. But it taught me that the market doesn't care about your passion — it cares about value." },
      { speaker: 3, text: "I was fired from my own startup by my co-founder. The humiliation was overwhelming. But it forced me to examine my leadership blind spots." },
      { speaker: 1, text: "And now you both lead companies valued at over a billion dollars. What changed?" },
      { speaker: 2, text: "Humility. I learned to listen to data instead of my ego. I became obsessed with understanding what customers actually need, not what I think they need." },
      { speaker: 3, text: "For me, it was learning to build teams. My biggest mistake was thinking I had to be the smartest person in the room. Now I hire people smarter than me." },
      { speaker: 1, text: "Incredible insights. Thank you both for your candor and wisdom. This has been an exceptional episode." }
    ]
  },
  science: {
    2: [
      { speaker: 1, text: "Welcome to Science Unpacked, where we make complex science accessible and fascinating. Today's topic — the mysteries of the human brain." },
      { speaker: 2, text: "Perfect topic. The brain is, in my opinion, the most complex structure in the known universe. And we're only beginning to understand it." },
      { speaker: 1, text: "Let's start with something mind-blowing. How much of our brain do we actually use?" },
      { speaker: 2, text: "The myth says ten percent. The reality? We use virtually all of it. Different regions are active at different times, but there's no dormant ninety percent waiting to be unlocked." },
      { speaker: 1, text: "So the movie Limitless was lying to us?" },
      { speaker: 2, text: "Great movie, terrible neuroscience. But what IS true is that we can significantly improve how efficiently our brains work through practice, sleep, and proper nutrition." },
      { speaker: 1, text: "Speaking of neuroplasticity — the brain's ability to rewire itself — what's the latest research telling us?" },
      { speaker: 2, text: "It's remarkable. We now know the brain continues to form new neural pathways throughout life. Learning a new language at sixty creates actual structural changes in the brain." },
      { speaker: 1, text: "That gives me hope. Thank you for making neuroscience so approachable. Truly fascinating conversation." },
      { speaker: 2, text: "My pleasure. The brain is endlessly fascinating, and the more we learn, the more questions we discover." }
    ],
    3: [
      { speaker: 1, text: "Welcome to Deep Science. Today we have a physicist and a biologist joining me to discuss where their fields are converging." },
      { speaker: 2, text: "Thanks for bringing us together. This intersection is where the most exciting science is happening." },
      { speaker: 3, text: "Absolutely. The tools of physics are revolutionizing how we understand biology." },
      { speaker: 1, text: "Give us an example of this convergence." },
      { speaker: 2, text: "Quantum biology. We're discovering that quantum effects play a role in photosynthesis, bird navigation, even enzyme reactions. Physics happening inside living cells." },
      { speaker: 3, text: "And from my side, biological computing. We're using DNA molecules to perform computations. Nature's been running algorithms for billions of years." },
      { speaker: 1, text: "Where do you see this heading in the next decade?" },
      { speaker: 2, text: "I think we'll crack consciousness. Not fully explain it, but understand the physical mechanisms. And that will change philosophy as much as science." },
      { speaker: 3, text: "I'm betting on synthetic biology. We'll be engineering organisms to solve problems — pollution, disease, food production. Biology as technology." },
      { speaker: 1, text: "Extraordinary perspectives from both of you. Science is truly entering its most interdisciplinary era. Thank you for this illuminating discussion." }
    ]
  }
};

app.post('/api/podcast/generate', authMiddleware, (req, res) => {
  try {
    const { topic, speakerCount, duration } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    const sc = Math.min(3, Math.max(1, parseInt(speakerCount) || 2));
    const dur = parseInt(duration) || 1;
    const topicLower = topic.toLowerCase();
    // Find matching template
    let templateKey = 'technology';
    if (topicLower.includes('business') || topicLower.includes('entrepreneur') || topicLower.includes('startup') || topicLower.includes('money') || topicLower.includes('finance')) templateKey = 'business';
    else if (topicLower.includes('science') || topicLower.includes('brain') || topicLower.includes('physics') || topicLower.includes('biology') || topicLower.includes('space')) templateKey = 'science';
    
    const templates = podcastTemplates[templateKey];
    const speakerKey = sc >= 3 ? 3 : 2;
    let script = templates[speakerKey] || templates[2];
    
    // Adjust length based on duration
    if (dur <= 1) {
      script = script.slice(0, Math.min(script.length, 6));
    } else if (dur <= 5) {
      script = script.slice(0, Math.min(script.length, 10));
    }
    // 10 min = full script
    
    res.json({
      script,
      metadata: { topic, speakerCount: sc, duration: dur, category: templateKey }
    });
  } catch (err) {
    console.error('Podcast generation error:', err);
    res.status(500).json({ error: 'Podcast generation failed' });
  }
});

// ==================== MOOD DETECTION ====================

const moodKeywords = {
  happy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'great', 'love', 'fantastic', 'beautiful', 'delighted', 'cheerful', 'glad', 'thrilled', 'blessed', 'grateful', 'smile', 'laugh', 'celebrate', 'fun', 'awesome', 'excellent', 'good'],
  sad: ['sad', 'depressed', 'unhappy', 'miserable', 'heartbroken', 'lonely', 'cry', 'tears', 'grief', 'sorrow', 'mourn', 'pain', 'hurt', 'lost', 'empty', 'broken', 'miss', 'regret', 'gloomy', 'hopeless'],
  angry: ['angry', 'furious', 'rage', 'hate', 'frustrated', 'annoyed', 'irritated', 'outraged', 'mad', 'disgusted', 'bitter', 'livid', 'hostile', 'aggressive', 'upset', 'resent'],
  anxious: ['anxious', 'worried', 'nervous', 'stressed', 'fear', 'panic', 'tense', 'uneasy', 'restless', 'overwhelmed', 'dread', 'insecure', 'uncertain', 'troubled', 'concerned'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'content', 'quiet', 'still', 'gentle', 'ease', 'comfort', 'meditate', 'breathe', 'zen', 'harmony'],
  energetic: ['energetic', 'excited', 'pumped', 'motivated', 'inspired', 'alive', 'dynamic', 'powerful', 'strong', 'unstoppable', 'fierce', 'fire', 'passion', 'drive', 'ready'],
  romantic: ['romantic', 'love', 'heart', 'darling', 'sweetheart', 'kiss', 'embrace', 'passion', 'desire', 'tender', 'intimate', 'adore', 'cherish', 'forever', 'soulmate'],
  nostalgic: ['nostalgic', 'remember', 'memories', 'past', 'childhood', 'old days', 'miss', 'reminisce', 'vintage', 'retro', 'flashback', 'once upon', 'used to', 'those days', 'long ago']
};

app.post('/api/mood/detect', authMiddleware, (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const lower = text.toLowerCase();
    const scores = {};
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      scores[mood] = 0;
      for (const kw of keywords) {
        const regex = new RegExp('\\b' + kw + '\\b', 'gi');
        const matches = lower.match(regex);
        if (matches) scores[mood] += matches.length;
      }
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topMood = sorted[0][1] > 0 ? sorted[0][0] : 'neutral';
    const confidence = sorted[0][1] > 0 ? Math.min(100, Math.round((sorted[0][1] / (text.split(/\s+/).length)) * 100 * 3)) : 50;
    const secondaryMood = sorted[1] && sorted[1][1] > 0 ? sorted[1][0] : null;
    res.json({
      mood: topMood,
      confidence,
      secondaryMood,
      scores,
      analysis: {
        wordCount: text.split(/\s+/).length,
        sentenceCount: text.split(/[.!?]+/).filter(s => s.trim()).length
      }
    });
  } catch (err) {
    console.error('Mood detection error:', err);
    res.status(500).json({ error: 'Mood detection failed' });
  }
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
