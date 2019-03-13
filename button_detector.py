from pydhcplib.dhcp_network import *
import os
import time

show_all_devices = False
if len(sys.argv) > 1:
    show_all_devices = True
seen_devices = {}
lastPress = None

def do_something():
    global lastPress
    if lastPress != None:
        if time.time() - lastPress < 2:
            return
    lastPress = time.time()
    print("button has been pressed, use curl")
    os.system('curl localhost:8000/button_pressed')

netopt = {'client_listen_port':"68", 'server_listen_port':"67", 'listen_address':"0.0.0.0"}

class Server(DhcpServer):
    def __init__(self, options, dashbuttons):
        DhcpServer.__init__(self, options["listen_address"],
        options["client_listen_port"],
            options["server_listen_port"])
        self.dashbuttons = dashbuttons

    def HandleDhcpRequest(self, packet):
        mac = self.hwaddr_to_str(packet.GetHardwareAddress())
        self.dashbuttons.press(mac)


    def hwaddr_to_str(self, hwaddr):
        result = []
        hexsym = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']
        for iterator in range(6) :
            result += [str(hexsym[hwaddr[iterator]/16]+hexsym[hwaddr[iterator]%16])]
        return ':'.join(result)

class DashButtons():
    def __init__(self):
        self.buttons = {}

    def register(self, mac, function):
        self.buttons[mac] = function

    def press(self, mac):
        if show_all_devices:
            if mac in seen_devices:
                seen_devices[mac]+=1
            else:
                seen_devices[mac]=1
            f = open('button_out.txt', 'a')
            f.write(str(seen_devices))
            f.close()
            for dev in seen_devices:
                print('device {} seen {} times'.format(dev, seen_devices[dev]))
            print("======")

        if mac in self.buttons:
            self.buttons[mac]()
            return True
        return False

dashbuttons = DashButtons()
dashbuttons.register("18:74:2e:09:d0:07", do_something)
# dashbuttons.register("", do_something)
# dashbuttons.register("", do_something)
# dashbuttons.register("", do_something)
server = Server(netopt, dashbuttons)

while True :
    server.GetNextDhcpPacket()

