# HARDWARE SETUP WALKTHROUGH

## SECTION 0: WHAT YOU NEED (Shopping List)

Before we start building, you need to gather these physical items. Think of this like gathering ingredients before cooking a meal.

- **Jetson Nano**: This is the mini-computer that acts as the "brain" for the camera. We recommend the 4GB version (it has more memory which helps everything run smoothly).
- **MicroSD Card**: This acts as the hard drive for the Jetson Nano. It must be at least 64GB (128GB is recommended so you don't run out of space). **Important:** Buy one that says "Class 10" or "A2" on it. These numbers mean the card can read and write data very fast.
- **Intel RealSense Depth Camera (D435i)**: This is a special camera that doesn't just see colors, it actually measures how far away things are using infrared light, allowing the robot to see in 3D.
- **USB-C Cable**: This connects the camera to the Jetson Nano. It **must be a USB 3.0 cable**. USB 2.0 cables (the thin ones often used just for charging phones) cannot handle the massive amount of 3D data the camera sends.
- **Power Supply for Jetson Nano**: You need a power plug that provides **5V and 4A** (5 Volts, 4 Amps). If you use a weak phone charger, the Jetson Nano will suddenly turn off when it tries to do hard math.
- **Computer/Laptop**: You need your personal Mac, Windows, or Linux laptop for the initial setup.
- **WiFi Router**: Both the Jetson Nano and your personal laptop must be connected to the exact same WiFi network so they can talk to each other.
- **USB Keyboard and HDMI Monitor**: You need these just for the first 20 minutes to set up the Jetson Nano. After that, you can unplug them forever.
- **Optional (USB Hub)**: If your keyboard and mouse use too many USB ports, a simple USB hub can give you more plugs.

---

## SECTION 1: SETTING UP THE JETSON NANO (One Time)

We need to put an operating system on the Jetson Nano. This is like installing Windows on a brand new PC.

**Step 1.1: Download the Jetson Nano operating system**
- Go to your personal laptop and visit: `https://developer.nvidia.com/embedded/downloads`
- Download the **Jetson Nano Developer Kit SD Card Image**.
- This file is very large. It is the complete "Ubuntu Linux" operating system specially modified by NVIDIA to work on the Jetson Nano.

**Step 1.2: Flash the operating system to the MicroSD card**
- Download a free program called **Balena Etcher** (`https://etcher.balena.io/`). This program safely copies the operating system onto your MicroSD card.
- Insert your MicroSD card into your personal laptop (use an adapter if your laptop only has big SD slots).
- Open Balena Etcher.
- Click **"Flash from file"** and select the huge file you downloaded in Step 1.1.
- Click **"Select target"** and choose your MicroSD card. (Make sure you pick the SD card and not your computer's actual hard drive!)
- Click **"Flash!"**
- *Success:* Wait about 15-20 minutes. Etcher will say "Flash Complete!" when it's done.

**Step 1.3: First boot of Jetson Nano**
- Take the MicroSD card out of your laptop and slide it into the slot on the back of the Jetson Nano module. It slides right under the metal heat sink.
- Plug your HDMI monitor and USB keyboard into the Jetson Nano.
- Plug in the Jetson Nano power supply.
- *What happens:* Green lights will turn on. On the monitor, you will see text scrolling and then a setup screen will appear.
- Accept the license agreements by following the on-screen prompts.
- When asked to create a user account, use these exactly (to make life easier later):
  - Username: `jetson`
  - Password: `jetson123`
- When asked, select your home WiFi network and enter your password.
- *Success:* You will eventually see a normal computer desktop background. 

**Step 1.4: Find the Jetson Nano's IP address**
- The IP address is like the phone number for the Jetson Nano. Your laptop needs to know it to call it over the WiFi.
- Open the **Terminal** program on the Jetson Nano (look for the black box icon).
- Type this command and press Enter:
```bash
ip addr show wlan0
```
- Look for the word `inet`. Next to it will be a number like `192.168.1.105`.
- Write this number down on a piece of paper!

**Step 1.5: Enable SSH (so laptop can control Jetson without keyboard/monitor)**
- **SSH** stands for Secure Shell. It's a way for your laptop to remotely control the Jetson Nano using just text commands over WiFi, so you don't need a monitor or keyboard plugged into the Jetson anymore.
- On the Jetson Nano terminal, type:
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```
- To test it, go back to your personal laptop, open its Terminal (or Command Prompt on Windows), and type:
```bash
ssh jetson@192.168.1.105
```
*(Replace the numbers with the IP address you wrote down).*
- *Success:* If it asks for a password, type `jetson123`. You are now remotely controlling the Jetson Nano! You can unplug the Jetson's HDMI monitor and keyboard.

**Step 1.6: Update the system (important!)**
- On your laptop, while remotely controlling the Jetson via SSH, type:
```bash
sudo apt-get update
sudo apt-get upgrade -y
```
- *Why:* This asks the internet for the newest security updates and bug fixes.
- *What happens:* It will ask for your password (`jetson123`). Then lots of text will scroll. This can take 20 minutes. Just let it finish.

---

## SECTION 2: CONNECTING THE DEPTH CAMERA

**Step 2.1: Physical connection**
- Look at the USB ports on the Jetson Nano. Notice some have a **blue plastic piece** inside. These are USB 3.0 ports, which are ultra-fast.
- Plug the USB-C cable into the RealSense camera, and plug the other end into a **blue USB 3.0 port** on the Jetson Nano.
- *Why:* Depth cameras send massive amounts of 3D data every second. Only the blue USB 3.0 ports are fast enough to handle this traffic.

**Step 2.2: Verify camera is detected**
- In your SSH terminal, type:
```bash
lsusb
```
- *Why:* This command lists every USB device the computer currently sees.
- *Success:* Look at the output. You should see a line that says `Intel Corp. RealSense`.
- *Failure:* If you don't see it, try a different blue USB port, or try a different USB cable.

**Step 2.3: Install camera permissions**
- By default, Linux computers block regular users from looking at raw camera data for security reasons. We need to give your `jetson` user account special permission.
- Type these commands:
```bash
sudo usermod -aG video $USER
sudo usermod -aG plugdev $USER
```
- *Why:* This adds your user account to the "video" and "plugdev" groups, granting you full access to cameras.
- **CRITICAL STEP:** You must log out and log back in for this to work. Type `exit` to close the SSH connection, then SSH back in.

**Step 2.4: Install Intel RealSense SDK**
- The SDK (Software Development Kit) is the translation software that lets the computer understand the camera's raw data.
- Type these exact commands one by one:
```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-key F6E65AC044F831AC80A06380C8B3A55A6F3EFCDE
sudo add-apt-repository "deb https://librealsense.intel.com/Debian/apt-repo bionic main" -u -y
sudo apt-get install -y librealsense2-utils librealsense2-dev
```
- *Failure:* If you get an error about keys, wait a minute and try the first command again. Sometimes the internet key server is busy.

**Step 2.5: Test the camera works**
- If you plugged a monitor back into the Jetson (or have X11 forwarding), you can type:
```bash
realsense-viewer
```
- *What it is:* This opens a graphical app showing the camera feeds.
- Click the toggle switches to turn on "Stereo Module" (the depth map) and "RGB Camera" (regular color video).
- *Success:* If you wave your hand in front of the camera, you will see a colorful 3D map where red means "close" and blue means "far away".

---

## SECTION 3: INSTALLING THE SOFTWARE STACK ON JETSON

**Step 3.1: Install ROS2 Humble**
- **ROS2** (Robot Operating System) isn't actually an operating system. It's a communication framework. It allows the camera software to instantly talk to the networking software like a postal service for robot data.
- Type this long command to install the base ROS2 system:
```bash
sudo apt update && sudo apt install curl -y
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu focal main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
sudo apt update
sudo apt install -y ros-humble-desktop ros-dev-tools
```
- This will take 15-20 minutes.

**Step 3.2: Download our project software**
- We need to download our custom robot code from the internet onto the Jetson Nano.
```bash
mkdir -p ~/depth_cam_ws/src
cd ~/depth_cam_ws/src
git clone https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git
```
- *Why:* `mkdir` creates a new folder. `git clone` securely downloads all the code files from GitHub into that folder.

**Step 3.3: Run the installation script**
- We created an automated script to install the rest of the puzzle pieces (SLAM software, networking tools, etc.).
```bash
cd ~/depth_cam_ws/src/mapping-robot-dashboard/amr_data_publisher
chmod +x scripts/install_depth_camera_jetson.sh
./scripts/install_depth_camera_jetson.sh
```
- *Why:* `chmod +x` tells the computer "this text file is actually a program you can run". The `./` tells the computer to execute it.
- Watch the text scroll. Green is good, red means error.

**Step 3.4: Build the software**
- Computers can't run human-written code directly; it must be "built" (compiled) into machine code first.
```bash
cd ~/depth_cam_ws
colcon build
source install/setup.bash
```
- *Success:* At the end of the `colcon build`, it should say `Summary: X packages finished`. If it says `failed`, read the red error text directly above it.

**Step 3.5: Configure your network settings**
- We need to tell the Jetson Nano where your personal laptop (the Docker Host) lives on the network.
```bash
nano ~/depth_cam_ws/src/mapping-robot-dashboard/amr_data_publisher/config/publisher_config.yaml
```
- *Why:* `nano` is a very simple text editor inside the terminal.
- Use the arrow keys to find the line that says `docker_host_ip: "FILL_THIS_IN"`.
- Delete `FILL_THIS_IN` and type your personal laptop's IP address. (On Windows, find it by typing `ipconfig` in Command Prompt. On Mac, type `ifconfig`).
- Press **Ctrl+X** to exit. It will ask if you want to save. Press **Y** for Yes, then press **Enter**.

---

## SECTION 4: SETTING UP THE DOCKER HOST (Your PC/Mac/Laptop)

**Step 4.1: Install Docker**
- **Docker** is a system that runs software inside virtual, isolated boxes called "containers". It ensures the complex databases we use will run perfectly on your laptop without messing up your laptop's system.
- Go to `https://www.docker.com/products/docker-desktop/`
- Download and install Docker Desktop for your Mac or Windows computer.
- Open the Docker Desktop app and leave it running in the background.
- Verify it works by opening a fresh Terminal/Command Prompt and typing:
```bash
docker --version
```

**Step 4.2: Download the Docker infrastructure files**
- If you haven't already, download or `git clone` the same `mapping-robot-dashboard` project onto your personal laptop.
- Open a Terminal on your laptop and go into that folder:
```bash
cd Downloads/mapping-robot-dashboard/amr_docker_infrastructure
```

**Step 4.3: Set up passwords**
- The databases need secure passwords.
```bash
cp .env.example .env
```
- *Why:* This copies the template file into a real file called `.env`.
- Open `.env` in any text editor (like VS Code, Notepad, or TextEdit).
- Change the fake passwords (like `change_me_...`) to real passwords. Keep them simple for this project. Write them down!

**Step 4.4: Create MQTT user accounts**
- MQTT is the fast radio/messaging system the Jetson uses to send 3D data to your laptop. It requires a username.
- Run the setup script:
```bash
chmod +x scripts/setup_mqtt_users.sh
./scripts/setup_mqtt_users.sh
```

**Step 4.5: Start all Docker services**
- This single command will download and start all databases and networking hubs!
```bash
chmod +x scripts/start_infrastructure.sh
./scripts/start_infrastructure.sh
```
- It takes about 30 seconds to start.
- To verify they are all running smoothly, type:
```bash
docker ps
```
- *Success:* You will see a list of 6 containers (InfluxDB, PostgreSQL, Mosquitto MQTT, API, Router, Rosbridge) and they should all say `Up` in the status column.

**Step 4.6: Test all services are working**
- Let's double check that everything is healthy.
```bash
chmod +x scripts/test_connections.sh
./scripts/test_connections.sh
```
- *Success:* You want to see green ✅ checkmarks. If you see a red ❌, it means a database didn't start properly (usually due to a password mismatch in your `.env` file).

---

## SECTION 5: STARTING THE DASHBOARD

**Step 5.1: Open the web dashboard**
- The web dashboard is the graphical user interface where you view the 3D maps.
- Open a new Terminal on your laptop. Go to the main project folder.
- Type:
```bash
npm install
npm run dev
```
- Open your web browser (Chrome or Edge recommended) and go to: `http://localhost:5173` (or `http://localhost:3000`).
- *Success:* You will see the dark-themed Mapping Dashboard. Because the Jetson Nano isn't running yet, the screens will be blank.

**Step 5.2: Verify Rosbridge connection in dashboard**
- Look at the top right of the dashboard screen.
- There should be a status indicator that says **"Connected"** with a green dot.
- *Why:* This means the webpage successfully connected to the Docker backend on your laptop.

---

## SECTION 6: STARTING THE DEPTH CAMERA ON JETSON

Now we bring the two halves together.

**Step 6.1: SSH into the Jetson from your laptop**
- Open a Terminal on your laptop and remotely connect to the Jetson:
```bash
ssh jetson@192.168.1.105
```

**Step 6.2: Source the ROS2 environment**
- ROS2 requires you to "source" its setup files. This basically tells the terminal "Hey, make sure you know where all the robot commands are located."
```bash
source /opt/ros/humble/setup.bash
source ~/depth_cam_ws/install/setup.bash
```
- To avoid doing this every single time, let's make it automatic by adding it to your `.bashrc` (a file that runs every time you log in):
```bash
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
echo "source ~/depth_cam_ws/install/setup.bash" >> ~/.bashrc
```

**Step 6.3: Start everything with ONE command**
- This is the big moment. Start the camera, the SLAM mapping software, and the network publisher all at once:
```bash
ros2 launch amr_data_publisher depth_camera_only.launch.py
```
- *What happens:* You will see a massive wall of text. 
- Look for `RealSense Node Is Up!` (the camera is working).
- Look for `rtabmap started` (the 3D mapping brain is working).
- Look for `MQTT connected to 192.168.x.x` (data is successfully flowing to your laptop).

---

## SECTION 7: SEEING THE DATA IN THE DASHBOARD

**Step 7.1: Refresh the dashboard and see live data**
- Go back to your browser window showing the dashboard.
- The color camera feed should appear almost immediately.
- After a few seconds, a massive cloud of colored dots will appear in the 3D view. This is the **Point Cloud**.

**Step 7.2: Move the camera to see the map build**
- Pick up the RealSense camera (or the Jetson Nano structure) and slowly pan it across the room.
- *Very Important:* **MOVE SLOWLY!** The software relies on visual features to track its location. If you whip it around too fast, the video gets blurry and the software gets "lost".
- *Success:* As you move, you will see the 3D map physically expand in your web browser. 

**Step 7.3: Verify data is being saved to databases**
- Open a new tab and go to the InfluxDB database viewer: `http://localhost:8086`
- Log in with the passwords from your `.env` file. Click the Data Explorer. You should see live telemetry numbers updating in the `amr_data` bucket.

---

## SECTION 8: AUTO-START ON BOOT (Optional but Recommended)

It is annoying to have to SSH into the Jetson Nano every time you turn it on. We can make the Jetson automatically start the camera software the moment you plug it into the wall.

- While SSH'd into the Jetson, type:
```bash
sudo nano /etc/systemd/system/depth-camera.service
```
- Paste this exact text into the file:
```ini
[Unit]
Description=Depth Camera ROS2 Publisher
After=network.target

[Service]
User=jetson
WorkingDirectory=/home/jetson/depth_cam_ws
ExecStartPre=/bin/bash -c 'source /opt/ros/humble/setup.bash'
ExecStart=/bin/bash -c 'source /home/jetson/depth_cam_ws/install/setup.bash && ros2 launch amr_data_publisher depth_camera_only.launch.py'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
- Save with Ctrl+X, Y, Enter.
- Now enable this automatic service:
```bash
sudo systemctl enable depth-camera.service
sudo systemctl start depth-camera.service
```
- Now, whenever the Jetson gets power, the camera turns on automatically!

---

## SECTION 9: COMPLETE STARTUP PROCEDURE (Quick Reference)

After you've done everything above ONCE, your daily workflow becomes incredibly simple:

**EVERY TIME YOU USE THE SYSTEM:**
================================

**Step A: Turn on the PC/Laptop running Docker**
1. Open terminal
2. `cd amr_docker_infrastructure`
3. `./scripts/start_infrastructure.sh`
4. Wait 30 seconds.
5. Open browser: `http://localhost:5173`

**Step B: Turn on the Jetson Nano**
1. Plug the power cord into the wall.
2. Wait 60 seconds for the Jetson to boot up.
3. The camera software will start automatically!

**Step C: You're live!**
- Look at the dashboard. You are mapping!

---

## SECTION 10: TROUBLESHOOTING GUIDE

**Problem 1: "Camera not found" error**
```text
Error: No RealSense devices found
```
- **Fix:** Did you plug the camera into a BLUE USB port on the Jetson? Black ports are too slow. Is the cable fully clicked in? Try a different high-quality USB-C cable.

**Problem 2: "Cannot connect to MQTT broker" error**
```text
Error: Connection refused to 192.168.x.x:1883
```
- **Fix:** This means the Jetson cannot find your laptop over the WiFi. Ensure both are connected to the EXACT same WiFi network. Make sure your laptop's firewall isn't blocking port 1883. Double-check that the IP address you put in `publisher_config.yaml` exactly matches your laptop's current IP address (IP addresses can change if you restart your router!).

**Problem 3: "Dashboard shows blank / no data"**
- **Fix:** Look at the top right of the dashboard. Does it say "Disconnected"? If so, the Docker containers on your laptop might have crashed. On your laptop terminal, type `docker compose restart`. 

**Problem 4: "ROS2 command not found"**
```text
bash: ros2: command not found
```
- **Fix:** You forgot to tell the terminal where ROS2 is. You must run `source /opt/ros/humble/setup.bash`. Refer back to Step 6.2 to make this automatic.

**Problem 5: "Permission denied" for camera**
- **Fix:** Linux blocked you from reading the USB port. Go back to Step 2.3 and run the `usermod` commands. **You must log out and back in** for group permissions to take effect.

**Problem 6: "3D map is drifting, jumping, or teleporting"**
- **Fix:** The SLAM software uses the video feed to track its location. If you look at a blank white wall, the software can't track movement and gets "lost". Point the camera at messy, textured areas with lots of objects. Also, move slower. 

---

## SECTION 11: WHAT EACH LIGHT AND INDICATOR MEANS

**On the Depth Camera:**
- **White light on side:** Camera has power and is ready.
- **Red glowing dots inside front glass:** The infrared depth sensor is actively measuring the room. It is safe, but it means data is flowing.

**In the Terminal (Jetson):**
- **Green text:** Success ✅ (Info messages).
- **Yellow text:** Warning (usually perfectly fine to ignore) ⚠️.
- **Red text:** Error. You must read it to see what failed ❌.

**In the Dashboard:**
- **Green dot:** Connected perfectly to the backend.
- **Red dot:** Cannot connect to the backend (Docker is likely off).
- **Updating numbers:** If metrics are changing rapidly, live data is successfully flowing from the Jetson.

---

## SECTION 12: IMPORTANT SAFETY NOTES

- The infrared projector in the RealSense camera is eye-safe (Class 1 laser rating), but as a general rule, do not stare directly into the lenses from 1 inch away for long periods.
- The Jetson Nano's giant metal heatsink **WILL get hot** to the touch. This is totally normal. Do not cover it with paper or put it in a sealed plastic box without a fan.
- Always power off the Jetson cleanly. Unplugging it from the wall while it is saving data can corrupt the MicroSD card. To turn it off safely, type `sudo shutdown -h now` in the terminal and wait for the green light to go out.

---

## APPENDIX A: QUICK COMMAND REFERENCE

```bash
# ── JETSON NANO COMMANDS ──────────────────────────────────

# Check camera connected (Look for Intel)
lsusb | grep Intel

# Start depth camera system manually
ros2 launch amr_data_publisher depth_camera_only.launch.py

# Check what data channels (topics) are active
ros2 topic list

# See raw point cloud data flowing in the terminal
ros2 topic echo /camera/depth/points --once

# Turn off Jetson Nano safely
sudo shutdown -h now

# ── DOCKER HOST (LAPTOP) COMMANDS ─────────────────────────

# Start all databases and routers
cd amr_docker_infrastructure && ./scripts/start_infrastructure.sh

# Stop everything securely
./scripts/stop_infrastructure.sh

# Check all services running
docker ps

# See internal logs if something is broken
docker logs amr_mqtt_broker
docker logs amr_rosbridge

# ── NETWORK COMMANDS ──────────────────────────────────────

# Find Jetson's IP address (run on Jetson)
ip addr show wlan0 | grep "inet "

# Find Laptop's IP address (run on Mac/Linux)
ifconfig | grep "inet "
# Find Laptop's IP address (run on Windows)
ipconfig

# Test connection between devices (press Ctrl+C to stop)
ping 192.168.x.x  
```

---

## APPENDIX B: GLOSSARY (Simple Definitions)

- **ROS2:** (Robot Operating System). A set of software tools that helps different parts of a robot communicate with each other. It's like the nervous system of a robot.
- **Depth Camera:** A camera that can measure how far away things are, giving it 3D vision.
- **Point Cloud:** A collection of thousands of tiny colored dots floating in 3D space. When viewed together, they form a 3D picture of a room.
- **SLAM:** (Simultaneous Localization and Mapping). This means the software figures out exactly where it is in a room AND draws a map of the room at the exact same time. It's like drawing a map of a maze while you walk through it blindly.
- **MQTT:** A lightning-fast messaging system. Think of it like a text-message service designed exclusively for robots to send numbers to computers instantly.
- **Docker:** A program that runs complicated software inside isolated "containers". It lets you run huge databases on your laptop without having to configure them manually.
- **Rosbridge:** A translation program. It translates robot data (ROS2) into a format that a standard Web Browser can understand (JSON/WebSockets).
- **WebSocket:** A live, constantly open connection between a web browser and a server. Instead of clicking "refresh" to get new data, a WebSocket streams new data continuously.
- **SSH:** (Secure Shell). A way to remotely control one computer from another using a terminal window over WiFi.
- **IP Address:** A unique number assigned to your computer on your WiFi network. It acts like a phone number.
- **Terminal:** A black window where you type direct text commands to control a computer, instead of using a mouse. 
- **InfluxDB:** A database uniquely designed for storing time-stamped numbers (like sensor readings over the last hour).
- **PostgreSQL:** A standard database for storing permanent, structured information.
