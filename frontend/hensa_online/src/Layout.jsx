import React from "react";
import Login from "./components/login/login";
import { motion } from "framer-motion";

const Layout = () => {
  return (
    <div className="flex h-screen w-full font-jakarta">
      {/* Panneau gauche avec background animé */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-16 overflow-hidden text-white">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/90 to-blue-600/90" />
        {/* Cercles animés */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-300/20"
              style={{
                width: `${Math.random() * 400 + 100}px`,
                height: `${Math.random() * 400 + 100}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                filter: "blur(40px)",
              }}
              animate={{
                x: [0, Math.random() * 150 - 75, Math.random() * 150 - 75, 0],
                y: [0, Math.random() * 150 - 75, Math.random() * 150 - 75, 0],
                scale: [
                  1,
                  Math.random() * 0.5 + 0.8,
                  Math.random() * 0.5 + 0.8,
                  1,
                ],
              }}
              transition={{
                duration: Math.random() * 15 + 15,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Deuxième couche de petits cercles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`small-${i}`}
              className="absolute rounded-full bg-white/5"
              style={{
                width: `${Math.random() * 150 + 50}px`,
                height: `${Math.random() * 150 + 50}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                filter: "blur(20px)",
              }}
              animate={{
                x: [0, Math.random() * 200 - 100],
                y: [0, Math.random() * 200 - 100],
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        {/* Logo avec animation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20"
          >
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              H
            </span>
          </motion.div>
          <div>
            <motion.p
              className="font-semibold text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Hensa Online
            </motion.p>
            <motion.p
              className="text-blue-200 text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Université Hensa
            </motion.p>
          </div>
        </motion.div>

        {/* Texte */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.p
              className="text-lg font-medium text-blue-200 mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Bienvenue sur
            </motion.p>

            <motion.h1
              className="text-5xl md:text-6xl font-bold mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Votre plateforme
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                universitaire intelligente
              </span>
            </motion.h1>
          </motion.div>

          <motion.p
            className="text-blue-100 max-w-md text-lg leading-relaxed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            Accédez à vos cours, emplois du temps, notes et communications en un
            seul endroit.
          </motion.p>

          {/* Badges animés */}
          <motion.div
            className="flex flex-wrap gap-3 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {["Cours", "Notes", "Emploi du temps", "Messages"].map(
              (text, i) => (
                <motion.div
                  key={text}
                  whileHover={{ scale: 1.05 }}
                  className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  {text}
                </motion.div>
              ),
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative z-10 text-sm text-blue-200/80"
        >
          © 2024 Hensa University - Tous droits réservés
        </motion.div>
      </div>

      {/* Panneau droit */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-8 py-14"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Login />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Layout;
