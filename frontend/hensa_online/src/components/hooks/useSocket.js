// src/hooks/useSocket.js
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

export const useSocket = () => {

  const [socket, setSocket] = useState(null);

  useEffect(() => {

    if (!socketInstance) {

      socketInstance = io("http://localhost:5000", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketInstance.on("connect", () => {

        console.log("🟢 Socket connecté :", socketInstance.id);

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (user?.role) {
          socketInstance.emit("join", { role: user.role });
          console.log(`👤 Rooms rejointes : ALL + ${user.role}`);
        }

      });

      socketInstance.on("disconnect", () => {
        console.log("🔴 Socket déconnecté");
      });

      socketInstance.on("connect_error", (err) => {
        console.error("❌ Erreur Socket :", err.message);
      });

    }

    setSocket(socketInstance);

    return () => {
      // on ne ferme pas la connexion globale
    };

  }, []);

  return socket;

};