# 🚀 ULTRA-SIMPLE SETUP GUIDE
*(Jetson Orin Nano + RealSense Depth Camera + Remote Dashboard Login)*

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
   - **What it does:** It instantly creates your database passwords, turns on all Docker servers (InfluxDB, PostgreSQL, MQTT), installs the React dashboard, and opens the Dashboard login screen in your browser.
   
4. **WRITE DOWN YOUR IP ADDRESS!**
   - At the end of the script, it will print your PC's IP Address in big letters (e.g., `192.168.1.5`). **Write this down immediately.** You need it for Part 2.

---

## 🤖 PART 2: JETSON ORIN NANO SETUP

Do this directly on your Jetson Orin Nano. This mini-computer will connect to the camera, run the Lifecycle Server, and wait for your command to beam the 3D data back to your PC.

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
     - It installs the Node.js Lifecycle Server.
     - It sets up a background service so the Lifecycle Server starts automatically every time you turn the Jetson on.

4. **WRITE DOWN THE JETSON IP ADDRESS!**
   - At the end of the script, it will print the **Jetson's IP Address**. You will need this to log into the Dashboard.

5. **Reboot the Jetson**
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
   - Open `http://localhost:5173` in your browser. You will see the **Robot Login Screen**.

2. **Turn on the Jetson Orin Nano:**
   - Plug the Jetson into the wall. Wait 60 seconds.
   - The Lifecycle Server starts automatically in the background, waiting for you.

3. **Launch the Camera from the Dashboard:**
   - On your PC's browser login screen, enter the **Jetson's IP Address** as the User ID.
   - Enter **`admin`** as the Password.
   - Click "LOGIN & LAUNCH".
   - *Magic happens:* The Dashboard sends an API request to the Jetson to fire up the depth camera. The live 3D Point Cloud will start building the map in real-time!

4. **Shutting Down:**
   - Simply click the **LOGOUT** button in the top right corner of the dashboard, OR just close your browser tab. The Jetson will automatically notice you left and will safely power down the camera to save battery!

---

### 🚑 Quick Fixes

- **"Cannot reach Jetson launch server"**: Ensure your PC and the Jetson are on the **exact same Wi-Fi network**.
- **"Dashboard shows disconnected"**: You logged in, but data isn't arriving. Check that the USB cable is fully pushed into the Jetson's blue port.
- **"IP Address Changed"**: If your router gave your PC a new IP address, open `amr_data_publisher/config/publisher_config.yaml` on the Jetson and type in the new one. If the Jetson got a new IP, use the new one on the Login screen!
