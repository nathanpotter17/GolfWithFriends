import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import WebSocket from "ws";
import { WebSocketServer } from "ws";
import os from "os";

const app = express();
const PORT = process.env.PORT || 8080;
// const ALLOWED_ORIGIN = "https://someurl.fly.dev/";
// const corsOptions = {
//   origin: "*",
//   methods: ["GET", "POST"],
//   allowedHeaders: ["Content-Type"],
// };
// app.use(cors(corsOptions));

// app.use(express.static(path.join(__dirname, "dist")));

// app.get("/", (req, res) => {
// res.sendFile(path.join(__dirname, "dist", "index.html"));
// });

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const players = {}; // Store each player's data by their unique ID
const tickSpeed = 1000 / 60; // 60 FPS
// const NUM_BOTS = 5;
const playerY = 0.25;

const WORLDX = 50;
const WORLDZ = 50;

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function createPlayer() {
  return {
    id: (Math.random() * 100).toFixed(0),
    x: Math.random() * WORLDX,
    y: playerY,
    z: Math.random() * WORLDZ,
    color: getRandomColor(),
    rx: 0,
    ry: 0,
    rz: 0,
  };
}

function broadcastPlayerUpdate() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "playerUpdate",
          players,
        })
      );
    }
  });
}

function broadcastConnectionCount() {
  const connectionCount = wss.clients.size;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "count",
          count: connectionCount,
        })
      );
    }
  });
}

function sendPing() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
    }
  });
}

function broadcastNetInfo() {
  const netInfo = {
    type: "netInfo",
    usage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    cpu: os.cpus()[0].model,
    totalMemory: `${(os.totalmem() / 1073741824).toFixed(2)} GB`,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(netInfo));
    }
  });
}

function sendTurn(playerID) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "turnStart",
          player: playerID,
        })
      );
    }
  });
}

// Stress Test Functions
// function createBot(amount) {
//   for (let i = 0; i < amount; i++) {
//     const bot = createPlayer();
//     bot.isBot = true;
//     players[bot.id] = bot;
//   }
// }

// function moveBots() {
//   Object.keys(players).forEach((id) => {
//     const player = players[id];
//     if (player.isBot) {
//       player.x = Math.random() * WORLDX;
//       player.y = 1.5;
//       player.z = Math.random() * WORLDZ;
//       broadcastPlayerUpdate();
//     }
//   });
// }

// Bot tick loop
// setInterval(() => {
//   moveBots();
// }, 15000);

// Main game loop
setInterval(() => {
  sendPing(); // Heartbeat to measure latency
  broadcastPlayerUpdate(); // Broadcast player positions regularly, to decrease latency - twice the load on the server though.
}, tickSpeed);

// wss.on("listening", () => {
//   console.log("Creating bots...");
//   // createBot(NUM_BOTS);
//   console.log("Bots created.");
// });

// handle upgrade requests
// server.on("upgrade", (req, socket, head) => {
//   wss.handleUpgrade(req, socket, head, (ws) => {
//     wss.emit("connection", ws, req);
//   });
// });

wss.on("connection", (ws) => {
  // const origin = request.headers.origin;

  // if (origin !== ALLOWED_ORIGIN) {
  //   console.log(`Blocked connection from origin: ${origin}`);
  //   ws.close(1008, "Origin not allowed"); // 1008: Policy Violation
  //   return;
  // }

  const newPlayer = createPlayer();
  players[newPlayer.id] = newPlayer;

  console.log(`Player connected: ${newPlayer.id}`);
  ws.send(JSON.stringify({ type: "init", player: newPlayer.id }));

  broadcastConnectionCount();

  broadcastNetInfo();

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      console.error("Error parsing message", error);
      return;
    }

    if (data.type === "move") {
      const player = players[newPlayer.id];
      if (player) {
        const dx = parseFloat(data.x || 0);
        const dy = parseFloat(data.y || 0);
        const dz = parseFloat(data.z || 0);

        player.x = dx;
        player.y = dy;
        player.z = dz;

        const drx = parseFloat(data.rx || 0);
        const dry = parseFloat(data.ry || 0);
        const drz = parseFloat(data.rz || 0);

        player.rx = drx;
        player.ry = dry;
        player.rz = drz;

        // data is emitted from the tick loop above

        // console.log(
        //   `New Data for ${player.id}: ${player.x}, ${player.y}, ${player.z}, ${player.rx}, ${player.ry}, ${player.rz}`
        // );

        broadcastPlayerUpdate();
      }
    } else if (data.type === "pong") {
      const latency = Date.now() - parseFloat(data.timestamp);
      ws.send(JSON.stringify({ type: "latency", latency }));
    } else if (data.type === "turnOver") {
      const playerId = data.player;

      // Find the current player
      const currentPlayer = Object.values(players).find(
        (p) => p.id === playerId
      );

      if (!currentPlayer) {
        console.error("Invalid player ID:", playerId);
        return;
      }

      // Move to the next player
      const nextPlayerIndex = Object.values(players).indexOf(currentPlayer) + 1;
      const nextPlayer =
        Object.values(players)[nextPlayerIndex % Object.keys(players).length];

      // Start the next player's turn
      sendTurn(nextPlayer.id);

      console.log(
        `Turn ended for ${playerId}. Next turn starts for ${nextPlayer.id}`
      );
    } else {
      console.log("Unknown message type", data, data.type);
    }
  });

  ws.on("close", () => {
    console.log(`Player disconnected: ${newPlayer.id}`);
    delete players[newPlayer.id];
    broadcastConnectionCount();
    broadcastPlayerUpdate();
  });

  ws.onerror = (error) => {
    console.error("WebSocket error", error);
  };
});

// Start the HTTP server with WebSocket support
server.listen(PORT, () => {
  console.log(`WebSocket server running on http://localhost:${PORT}`);
});
