#!/usr/bin/env python3
import argparse, json, os, secrets, sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
BASE_DEFAULT='https://agent-535.artifacts.catsco.fun:19993'
def cfg():
 p=Path.home()/'.config/catsco/people-board-client.json'; d={}
 if p.exists(): d=json.loads(p.read_text(encoding='utf-8'))
 return d
def token(write=False):
 c=cfg(); return os.environ.get('PEOPLE_BOARD_WRITE_TOKEN' if write else 'PEOPLE_BOARD_READ_TOKEN') or c.get('write_token' if write else 'read_token') or (c.get('write_token') if not write else None)
def sets(items):
 out={}
 for x in items or []:
  if '=' not in x: raise SystemExit('--set requires key=value')
  k,v=x.split('=',1); out[k]=v
 return out
def call(method,path,body=None,write=False):
 c=cfg(); t=token(write)
 if not t: raise SystemExit('Missing board credential. Provision it privately in environment or ~/.config/catsco/people-board-client.json')
 base=os.environ.get('PEOPLE_BOARD_API_BASE') or c.get('api_base') or BASE_DEFAULT
 raw=json.dumps(body,ensure_ascii=False).encode() if body is not None else None
 r=Request(base+path,data=raw,method=method,headers={'Authorization':'Bearer '+t,'Content-Type':'application/json'})
 try:
  with urlopen(r,timeout=20) as x: return json.load(x)
 except HTTPError as e:
  msg=e.read().decode(errors='replace'); raise SystemExit(f'HTTP {e.code}: {msg}')
def main():
 ap=argparse.ArgumentParser(); sp=ap.add_subparsers(dest='cmd',required=True)
 sp.add_parser('snapshot')
 p=sp.add_parser('update-person'); p.add_argument('--person-id',required=True); p.add_argument('--expected-version',type=int,required=True); p.add_argument('--request-id'); p.add_argument('--set',action='append',default=[])
 p=sp.add_parser('create-assignment'); p.add_argument('--person-id',required=True); p.add_argument('--title',required=True); p.add_argument('--request-id'); p.add_argument('--set',action='append',default=[])
 p=sp.add_parser('update-assignment'); p.add_argument('--assignment-id',required=True); p.add_argument('--expected-version',type=int,required=True); p.add_argument('--request-id'); p.add_argument('--set',action='append',default=[])
 a=ap.parse_args()
 if a.cmd=='snapshot': out=call('GET','/snapshot')
 else:
  d=sets(a.set); d.update({'request_id':a.request_id or secrets.token_hex(12)})
  if a.cmd=='update-person': d['expected_version']=a.expected_version; out=call('PATCH','/people/'+a.person_id,d,True)
  elif a.cmd=='create-assignment': d.update({'person_id':a.person_id,'title':a.title}); out=call('POST','/assignments',d,True)
  else: d['expected_version']=a.expected_version; out=call('PATCH','/assignments/'+a.assignment_id,d,True)
 print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
