# 🚀 ULTRA-SIMPLE SETUP GUIDE
*(Jetson Orin Nano + RealSense Depth Camera)*

We've completely automated the setup process. You no longer need to edit code, install individual packages, or manually configure networking. Just run two "Magic Scripts" and you're done.

---

## 🛠️ PART 1: PC DASHBOARD SETUP

Do this on your personal laptop (Mac, Windows, or Linux). This laptop will host the databases and the 3D Dashboard.

1. **Install Docker Desktop & Node.js**
   - Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Open it and leave it running.
   - Download and install [Node.js](https://nodejs.org/).

2. **Download the Software**
   - Open your terminal and download the code:
     ```bash
     git clone https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git
     cd mapping-robot-dashboard
     ```

3. **Run the Magic PC Script**
   - In your terminal, run this exact command:
     ```bash
     ./magic_setup_pc.sh
     ```
   - **What it does:** It instantly creates your database passwords, turns on all Docker servers (InfluxDB, PostgreSQL, MQTT), installs the React dashboard, and opens the Dashboard.
   
4. **WRITE DOWN YOUR IP ADDRESS!**
   - At the end of the script, it will print your PC's IP Address in big letters (e.g., `192.168.1.5`). **Write this down immediately.** You need it for Part 2.

---

## 🤖 PART 2: JETSON ORIN NANO SETUP

Do this directly on your Jetson Orin Nano. This mini-computer will connect to the camera and beam the 3D data back to your PC.

1. **Plug in the Camera**
   - Connect the Intel RealSense D435i camera to a **BLUE USB 3.0 Port** on the Jetson Orin Nano. If you use a black port, the camera will crash.

2. **Download the Software**
   - Open the Jetson's terminal and download the code:
     ```bash
     git clone https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git
     cd mapping-robot-dashboard
     ```

3. **Run the Magic Jetson Script**
   - In your terminal, run this exact command:
     ```bash
     ./magic_setup_jetson.sh
     ```
   - **What it does:** 
     - It will ask you for the **PC's IP Address** you wrote down in Part 1. Type it in and hit Enter.
     - It automatically downloads ROS2, the RealSense drivers, and 3D mapping software (this takes ~20 minutes).
     - It fixes Linux camera permissions.
     - It sets up a background service so the camera starts automatically every time you turn the Jetson on.

4. **Reboot the Jetson**
   - When the script finishes, simply type:
     ```bash
     sudo reboot
     ```

---

## 🎉 PART 3: YOU'RE DONE! (How to use it daily)

That's it! From now on, you never have to do setup again.

**Every single day, this is your workflow:**

1. **Turn on the PC:**
   - Open terminal, go to `mapping-robot-dashboard` and run `./magic_setup_pc.sh`. 
   - Open `http://localhost:5173` in your browser.

2. **Turn on the Jetson Orin Nano:**
   - Plug the Jetson into the wall. Wait 60 seconds.
   - **The camera software starts automatically in the background.** You don't have to type anything.

3. **View the Dashboard:**
   - Look at your browser! You will see the live color camera feed and the live 3D Point Cloud building the map in real-time. Data is automatically saving to the databases.

---

### 🚑 Quick Fixes

- **"Dashboard shows disconnected"**: Ensure your PC and the Jetson are on the **exact same Wi-Fi network**.
- **"No Camera Data"**: Check that the USB cable is fully pushed into the Jetson's blue port.
- **"IP Address Changed"**: If your router gave your PC a new IP address, open `amr_data_publisher/config/publisher_config.yaml` on the Jetson and type in the new one.
