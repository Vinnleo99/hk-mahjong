# Copy the held-out photos and build 30 composite row photos for training/eval.ts.
import json, numpy as np, random
from PIL import Image
sp=json.load(open('split.json')); test=sp['test']
import os, shutil
os.makedirs('data/heldout',exist_ok=True)
for n,c in test: shutil.copy('images/'+n,'data/heldout/'+n)
json.dump(test,open('data/heldout/meta.json','w'))
# Composite rows: 14 held-out tiles pasted (with small gaps, jitter) on a dark green cloth, some tilted, some 2 rows.
random.seed(1); import os; os.makedirs('data/rows',exist_ok=True); meta=[]
for k in range(30):
    picks=random.sample(test,14); two=k%3==2; tilt=random.uniform(-8,8) if k%2 else 0
    th=110; tw=int(th*0.75); per=7 if two else 14
    W=per*(tw+8)+80; H=(2 if two else 1)*(th+30)+80
    bg=Image.new('RGB',(W,H),(25,70,45)); arr=np.array(bg).astype(int)+np.random.randint(-12,12,(H,W,3)); bg=Image.fromarray(np.clip(arr,0,255).astype('uint8'))
    for i,(n,c) in enumerate(picks):
        r,col=divmod(i,per); t=Image.open('images/'+n).convert('RGB').resize((tw,th))
        bg.paste(t,(40+col*(tw+8)+random.randint(-2,2),40+r*(th+30)+random.randint(-3,3)))
    if tilt: bg=bg.rotate(tilt,resample=Image.BICUBIC,fillcolor=(25,70,45),expand=True)
    bg.save(f'data/rows/{k}.jpg',quality=90); meta.append({'file':f'{k}.jpg','tiles':[c for n,c in picks],'tilt':tilt,'rows':2 if two else 1})
json.dump(meta,open('data/rows/meta.json','w')); print('rows ok')
