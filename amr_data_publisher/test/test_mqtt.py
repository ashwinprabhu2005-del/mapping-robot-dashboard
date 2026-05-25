import pytest
from amr_data_publisher.connection_manager import ConnectionManager

def test_connection_manager_init():
    conn = ConnectionManager(
        host="localhost",
        port=1883,
        username="user",
        password="pwd",
        reconnect_interval=5
    )
    assert conn.host == "localhost"
    assert conn.port == 1883
    assert conn.username == "user"
    assert conn.password == "pwd"
    assert conn.connected is False
