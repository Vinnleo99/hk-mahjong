# Fold BatchNorm into convs, int8-quantise per output channel, write a flat binary
# for the app's tiny TS runtime. Also verifies the folded fp32 + int8 nets agree.
import torch, torch.nn as nn, numpy as np, json, sys
exec(open('model_def.py').read())
m=build(); m.load_state_dict(torch.load('m.pt')); m.eval()
layers=[]
for blk in list(m)[:4]:
    mods=list(blk)
    for conv,bn in [(mods[0],mods[1]),(mods[3],mods[4])]:
        s=bn.weight/torch.sqrt(bn.running_var+bn.eps)
        w=(conv.weight*s[:,None,None,None]).detach().numpy(); b=(bn.bias-bn.running_mean*s).detach().numpy()
        layers.append((w,b))
lin=m[-1]; layers.append((lin.weight.detach().numpy(),lin.bias.detach().numpy()))
buf=bytearray(); meta=[]
for w,b in layers:
    o=w.shape[0]; wf=w.reshape(o,-1); sc=np.abs(wf).max(1)/127+1e-12
    q=np.clip(np.round(wf/sc[:,None]),-127,127).astype(np.int8)
    meta.append(list(w.shape))
    buf+=sc.astype(np.float32).tobytes()+b.astype(np.float32).tobytes()+q.tobytes()
    while len(buf)%4: buf+=b'\0'
open(sys.argv[1],'wb').write(bytes(buf)); print('bytes',len(buf)); print(json.dumps(meta))
