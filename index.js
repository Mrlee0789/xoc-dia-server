const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

let rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join_room", ({ username, room }) => {
    socket.join(room);
    const isAdmin = username.toLowerCase() === "admin";

    if (!rooms[room]) {
      rooms[room] = { players: [], admin: isAdmin ? socket.id : null };
    }

    rooms[room].players.push({ username, socketId: socket.id });
    io.to(room).emit("room_update", rooms[room].players);
  });

  socket.on("place_bet", ({ room, choice, amount }) => {
    const player = rooms[room]?.players.find(p => p.socketId === socket.id);
    if (player) {
      player.choice = choice;
      player.bet = amount;
    }
  });

  socket.on("start_game", ({ room, forced }) => {
    let coins = [rand(), rand(), rand(), rand()];

    if (forced !== "random") {
      let redCount = coins.filter(c => c === "🔴").length;
      const isEven = redCount % 2 === 0;
      const needEven = forced === "Chan";

      while (isEven !== needEven) {
        coins = [rand(), rand(), rand(), rand()];
        redCount = coins.filter(c => c === "🔴").length;
      }
    }

    const redCount = coins.filter(c => c === "🔴").length;
    const outcome = redCount % 2 === 0 ? "Chan" : "Le";

    io.to(room).emit("game_result", { coins, redCount, outcome });
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter(p => p.socketId !== socket.id);
      if (rooms[room].players.length === 0) delete rooms[room];
      else io.to(room).emit("room_update", rooms[room].players);
    }
  });
});

function rand() {
  return Math.random() > 0.5 ? "🔴" : "⚫";
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
