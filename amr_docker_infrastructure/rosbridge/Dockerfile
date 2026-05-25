FROM ros:humble-ros-base

# Install rosbridge-suite, pip, and opencv
RUN apt-get update && apt-get install -y \
    ros-humble-rosbridge-server \
    python3-pip \
    python3-numpy \
    python3-opencv \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install paho-mqtt==1.6.1

WORKDIR /bridge
COPY . .

# Set up permissions
RUN chmod +x ros_entrypoint.sh

ENTRYPOINT ["./ros_entrypoint.sh"]
CMD ["ros2", "launch", "launch/rosbridge.launch.py"]
