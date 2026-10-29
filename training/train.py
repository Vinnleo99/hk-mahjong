import csv, random, json, numpy as np, torch, torch.nn as nn
from PIL import Image
import torchvision.transforms as T
random.seed(0); torch.manual_seed(0); torch.set_num_threads(8)
def mapl(l):
    l=int(l)
    if l<=9: return 9+l-1
    if l<=18: return 18+l-10
    if l<=27: return l-19
    if l<=34: return 27+l-28
    if l<=38: return 38+l-35
    return 34+l-39
rows=[(r['image-name'],mapl(r['label'])) for r in csv.DictReader(open('data.csv'))]
byc={}
for n,c in rows: byc.setdefault(c,[]).append(n)
train,test=[],[]
for c,ns in byc.items():
    random.shuffle(ns); k=max(1,round(len(ns)*0.2)); test+= [(n,c) for n in ns[:k]]; train+=[(n,c) for n in ns[k:]]
json.dump({'train':train,'test':test},open('split.json','w'))
S=48
load=lambda p: Image.open(p).convert('RGB')
real=[(load('images/'+n),c) for n,c in train]
syn=[(load(f'synth/{i}.png'),i) for i in range(42)]
aug=T.Compose([T.RandomResizedCrop((S*4//3,S),scale=(0.75,1),ratio=(0.6,0.9)),T.RandomRotation(12,fill=128),
  T.ColorJitter(0.4,0.4,0.3,0.03),T.RandomGrayscale(0.05),T.GaussianBlur(3,(0.1,1.5)),T.ToTensor()])
ev=T.Compose([T.Resize((S*4//3,S)),T.ToTensor()])
class DS(torch.utils.data.Dataset):
    def __init__(s,items,tf,rep=1): s.i=items*rep; s.tf=tf
    def __len__(s): return len(s.i)
    def __getitem__(s,k): im,c=s.i[k]; return s.tf(im),c
tr=torch.utils.data.ConcatDataset([DS(real,aug,8),DS(syn,aug,40)])
te=DS([(load('images/'+n),c) for n,c in test],ev)
def blk(i,o): return nn.Sequential(nn.Conv2d(i,o,3,padding=1,bias=False),nn.BatchNorm2d(o),nn.ReLU(),nn.Conv2d(o,o,3,padding=1,bias=False),nn.BatchNorm2d(o),nn.ReLU(),nn.MaxPool2d(2))
m=nn.Sequential(blk(3,24),blk(24,48),blk(48,96),blk(96,128),nn.AdaptiveAvgPool2d(1),nn.Flatten(),nn.Dropout(0.3),nn.Linear(128,42))
print('params',sum(p.numel() for p in m.parameters()))
dl=torch.utils.data.DataLoader(tr,64,shuffle=True,num_workers=6)
E_=30; opt=torch.optim.AdamW(m.parameters(),2e-3,weight_decay=1e-3); sch=torch.optim.lr_scheduler.OneCycleLR(opt,4e-3,total_steps=E_*len(dl))
def evaluate():
    m.eval(); ok=ok3=0; per={}
    with torch.no_grad():
        for x,c in torch.utils.data.DataLoader(te,128):
            o=m(x); t3=o.topk(3,1).indices
            ok+=(t3[:,0]==c).sum().item(); ok3+=(t3==c[:,None]).any(1).sum().item()
    m.train(); return ok/len(te), ok3/len(te)
for e in range(E_):
    tl=0
    for x,y in dl:
        l=nn.functional.cross_entropy(m(x),y,label_smoothing=0.1); opt.zero_grad(); l.backward(); opt.step(); sch.step(); tl+=l.item()
    print(e,round(tl/len(dl),3),evaluate(),flush=True)
m.eval(); torch.save(m.state_dict(),'m.pt')
torch.onnx.export(m,torch.zeros(1,3,S*4//3,S),'tiles.onnx',input_names=['x'],output_names=['y'],dynamic_axes={'x':{0:'n'},'y':{0:'n'}},opset_version=17,dynamo=False)
print('test n',len(te),'final',evaluate())
