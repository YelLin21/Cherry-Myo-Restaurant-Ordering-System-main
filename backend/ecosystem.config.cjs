module.exports = {
  apps: [
    {
      name: "cherry-myo-backend",
      script: "index.js",
      cwd: "/root/Cherry-Myo-Restaurant-Ordering-System-main/backend",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      time: true,
    },
  ],
};
