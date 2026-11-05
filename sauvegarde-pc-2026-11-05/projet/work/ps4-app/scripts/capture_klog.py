"""Read-only console log capture. Requires user-provided PS4 IP and enabled Klog server."""
from pathlib import Path
import socket,argparse,time,ipaddress,json
p=argparse.ArgumentParser();p.add_argument('--host',required=True);p.add_argument('--seconds',type=int,default=45);args=p.parse_args()
ipaddress.ip_address(args.host)
assert 1<=args.seconds<=120
root=Path(__file__).resolve().parents[3]/'outputs/ps4/crash-analysis';root.mkdir(parents=True,exist_ok=True)
target=root/('klog-'+time.strftime('%Y%m%d-%H%M%S')+'.log')
total=0;deadline=time.monotonic()+args.seconds;limit=2*1024*1024
with socket.create_connection((args.host,3232),timeout=10) as console,target.open('wb') as output:
 console.settimeout(1)
 print('Connected for read-only logging. No payload or console files are sent.',flush=True)
 while time.monotonic()<deadline and total<limit:
  try:data=console.recv(min(65536,limit-total))
  except socket.timeout:continue
  if not data:break
  output.write(data);output.flush();total+=len(data)
print(json.dumps({'file':str(target),'bytes':total,'limited':total>=limit}))
