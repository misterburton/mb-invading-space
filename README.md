# Invading Space

A modern remix of the classic alien shooter game that defined a generation of arcade gaming!

## Project Structure

The project is organized to support both web and React Native deployment:

```
invading-space/
├── src/                  # Source code
│   ├── assets/           # Game assets
│   │   ├── images/       # Image assets
│   │   └── fonts/        # Font assets
│   ├── core/             # Core game logic
│   ├── shaders/          # WebGL shaders
│   ├── lib/              # Third-party libraries
│   ├── components/       # Game components
│   └── styles.css        # CSS styles
├── public/               # Web build output
├── build.js              # Build script
└── package.json          # Project configuration
```

## Development

To build the project:

```bash
npm run build
```

To start a local development server:

```bash
npm start
```

To clean the build output:

```bash
npm run clean
```

## Gameplay

Invading Space is a modern take on the classic alien shooter game, but with a twist - you play as the aliens! Instead of defending Earth, you control the invading alien forces trying to destroy the automated defense cannon below.

- Tap on aliens to make them shoot at the cannon
- The defense cannon moves and shoots automatically
- Your goal is to destroy the cannon before it destroys all your aliens

## Deployment

The `public` directory contains all files needed for web deployment.

For React Native deployment, the `src` directory contains all the necessary game logic that can be integrated into a React Native project. 
