"""Extract source text and real catalogue photographs; never fabricate prices/stock.
Optional reimport: python scripts/import-catalogs.py --sources /path/to/pdfs
Requires PyMuPDF, Pillow and (for scanned documents) Tesseract.
"""
import argparse, json, re, shutil, unicodedata, subprocess, hashlib, os
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--sources', default=str(ROOT.parent / 'attachments'))
args = parser.parse_args()
sources = list(Path(args.sources).rglob('*.pdf'))
docs = {}
for f in sources:
    key = f.stem if f.stem in ['comercial','travesseiros','hotelaria','revendedor-2021'] else 'comercial' if '8368' in f.name else 'travesseiros' if '8537' in f.name else 'hotelaria' if 'HOTELARIA' in f.name else 'revendedor-2021' if 'revendedor' in f.name else None
    if key:
        target = ROOT / 'sources/catalogs' / (key + '.pdf')
        target.parent.mkdir(parents=True, exist_ok=True)
        if f.resolve() != target.resolve(): shutil.copyfile(f, target)
        docs[key] = fitz.open(target)

out = ROOT / 'public/catalogo'
out.mkdir(parents=True, exist_ok=True)

def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', t).encode('ascii','ignore').decode().lower()).strip('-')

def clean(t):
    for a,b in [('fi r','fir'),('fi o','fio'),('fi b','fib'),('fl e','fle'),('refl o','reflo'),('certifi ','certifi'), ('\uf0b7','•')]: t=t.replace(a,b)
    return re.sub(r'\s+', ' ', t).strip()

def photo(key, page, suffix='', clip=None):
    p = docs[key][page-1]
    name = f'{key}-{page}{suffix}.webp'
    if clip is None:
        rects=[]
        for im in p.get_images():
            if im[2]>=300 and im[3]>=100:
                for r in p.get_image_rects(im[0]):
                    if r.height < p.rect.height*.8 and r.width > p.rect.width*.18: rects.append(r)
        if rects:
            clip=fitz.Rect(rects[0])
            for r in rects[1:]: clip |= r
            clip = (clip + (-4,-4,4,4)) & p.rect
        else:
            w,h=p.rect.width,p.rect.height
            clip=fitz.Rect(w*.12,h*.22,w*.88,h*.59)
    pix=p.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip,alpha=False)
    from PIL import Image
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im.thumbnail((1200,900)); im.save(out/name,'WEBP',quality=86)
    return '/catalogo/'+name

products=[]
def add(key,page,name,category='Colchões', extra_pages=None, text_override=None, clip=None, image_suffix=""):
    p=docs[key][page-1]; text=p.get_text()
    joined=text+'\n'+'\n'.join(docs[key][i-1].get_text() for i in (extra_pages or []))
    # Preserve the complete source for review, but show only descriptive paragraphs.
    paragraphs=[]
    for block in p.get_text('blocks'):
        t=clean(block[4])
        if len(t)>95 and not ('MEDIDAS' in t or 'CÓDIGO' in t or 'Códigos e Medidas' in t): paragraphs.append(t)
    description=text_override or '\n\n'.join(paragraphs[:5]) or f'{name}, da linha Ortobom. Consulte as especificações completas no catálogo do fabricante.'
    sizes=[]
    for a,b in re.findall(r'(\d{2,3})\s*[xX×]\s*(\d{2,3})',joined):
        x,y=int(a),int(b)
        if 20<=x<=220 and 20<=y<=220:
            s=f'{x} × {y} cm'
            if s not in sizes: sizes.append(s)
    for a,b in re.findall(r'(\d[,.]\d{2})\s*m\s*[xX×]\s*(\d[,.]\d{2})\s*m',joined):
        s=f'{round(float(a.replace(",","."))*100)} × {round(float(b.replace(",","."))*100)} cm'
        if s not in sizes: sizes.append(s)
    image=photo(key,page,image_suffix,clip=clip)
    product={'id':slug(name),'slug':slug(name),'name':name,'brand':'Ortobom','category':category,'description':description,'images':[image],'sizes':sizes or ['Consultar medida'],'colors':[{'name':'Original','hex':'#dedbd4','image':image}],'priceCents':None,'stock':None,'active':True,'featured':len(products)<8,'source':{'catalog':key,'page':page,'url':f'/catalogos/{key}.pdf#page={page}'},'sourceText':clean(joined),'specs':{'Medidas':' · '.join(sizes) or 'Consulte o catálogo','Linha':'Hotelaria' if 'Orthotel' in name else 'Ortobom','Material':'Veja as especificações do fabricante'},'variantInventory':{}}
    products.append(product)
    return product

names={3:'Exclusive Gel',4:'Exclusive Visco',5:'Exclusive Foam',6:'New Freedom',7:'Exclusive Sleep',8:'Exclusive Spring',9:'Orthopedic',10:'Exclusive LFK',12:'Fit Spring Pocket',13:'Fit Progressive',14:'Fit Spring',15:'Fit Ortopédico',16:'Fit 23',17:'Fit 28',18:'Fit 33',19:'Fit 45',20:'Baby Light D18',21:'Pic Go',22:'Self',23:'Star Exclusive',24:'Star New',25:'Star Black',26:'Star Superpocket',27:'Baby Malha Petit Blanc',28:'Baby Malha Petit Perle',30:'Airtech Springpocket',31:'Airtech Progressive',32:'Airtech 1.5.0',33:'Airtech 1.0.0',34:'Airtech 6.0',35:'Iso Dupla Face',36:'Iso 6.0',37:'Iso 1.0.0',38:'Iso 1.5.0',39:'Iso Nanolastic',40:'Physical Superpocket',41:'Physical Nanolastic',42:'Physical Super Hiper Resistente',43:'Physical Hiper Resistente',44:'Physical Mega Resistente',45:'Physical Ultra Resistente',46:'Physical Super Resistente',47:'Physical Resistente Liso',48:'Physical Resistente',49:'Colchão Auxiliar Cori Nero',50:'Colchão Auxiliar Dream',51:'Colchão Auxiliar Orthopedic',52:'Colchão Auxiliar Union',53:'Colchão Auxiliar Cori Bianco',54:'Colchonete Physical',55:'Baby Physical D18',56:'Iso Superpocket',58:'Conjugado Union Ortopedic',59:'Conjugado Union Spring',60:'Conjugado Cori Bianco Vazado',61:'Conjugado Cori Nero Vazado'}
for page,name in names.items(): add('comercial',page,'Colchão Ortobom '+name if not name.startswith(('Colchão','Colchonete','Conjugado')) else name)
for page,name in [(63,'Cabeceira Piave Linho'),(64,'Cabeceira Piave Veludo'),(65,'Cabeceira Murat Facto')]: add('comercial',page,name,'Cabeceiras')
for page,name in [(67,'Base Sommier Corino'),(69,'Base Sommier Camurça'),(71,'Base Sommier Linho')]: add('comercial',page,name,'Bases e camas',extra_pages=[page+1])
# These colors have distinct, real product photographs in the source.
for base,pages in [('Base Sommier Baú Camurça',[(73,'Cinza','#747472'),(74,'Bege','#bfb29e'),(75,'Preto','#252525'),(76,'Marrom','#6b4b38')]),('Base Sommier Baú Corino',[(77,'Branco','#f5f4ef'),(78,'Cinza','#7d7d7d'),(79,'Bege','#c1b098'),(80,'Preto','#222222'),(81,'Marrom','#6b4839')])]:
    q=add('comercial',pages[0][0],base,'Bases e camas',extra_pages=[x[0] for x in pages[1:]])
    q['colors']=[{'name':color,'hex':hexcode,'image':photo('comercial',page)} for page,color,hexcode in pages]
    q['images']=[x['image'] for x in q['colors']]
for page,name in [(82,'Base Baú Corino Branco Vazada'),(83,'Base Baú Corino Preto Vazada'),(84,'Base Corino Branco Vazada'),(85,'Base Corino Preto Vazada'),(86,'Base Baú Physical Branco'),(87,'Base Baú Physical Preto'),(88,'Base Sommier Light Preto'),(89,'Base Sommier Light Branco'),(90,'Base Sommier Excelente')]: add('comercial',page,name,'Bases e camas')
# Prefer the 2024 hotel specifications over older duplicates.
for page,name in [(4,'Orthotel Boutique'),(5,'Orthotel Dupla Face'),(6,'Orthotel Superpocket Superluxo'),(7,'Orthotel Superluxo'),(8,'Orthotel Superpocket Luxo'),(9,'Orthotel Luxo'),(10,'Orthotel Standard'),(11,'Versátil Orthotel Luxo'),(12,'Versátil Orthotel Standard')]: add('hotelaria',page,'Colchão '+name,'Hotelaria')
for page,name in [(101,'Baby Hospitalar'),(103,'Colchonete Maca de Resgate'),(104,'Colchonete para Academia'),(105,'Travesseiro Hospitalar'),(106,'Suavencosto Hospitalar Alveolado'),(108,'Travesseiro Conforto Anatômico'),(109,'Suporte Anatômico'),(110,'Suporte Ortopédico Lombar'),(111,'Almofada Redonda com Orifício'),(112,'Almofada Terapêutica'),(123,'Mochila Camping'),(124,'Suavencosto Sleep Baby'),(125,'Suavencosto Sleep'),(126,'Encosto Dino Veludo')]: add('comercial',page,name,'Acessórios')
# The pillow document is scanned: retain the original; OCR is saved for review.
pillow_names={3:'Espuma Viscoelástica',4:'Espuma Látex',5:'Flocos',6:'Nuvem',7:'Percal 200 Fios',8:'Max Malha',9:'Aman',10:'Amore',11:'High-Comfort',12:'Percal 200 Fios Plus',13:'Casadinho',14:'Orthotel Percal',15:'Soneca'}
for page,name in pillow_names.items():
    p=docs['travesseiros'][page-1]
    pix=p.get_pixmap(matrix=fitz.Matrix(1.7,1.7)); temp=ROOT.parent/'catalog-analysis'/f'pillow-{page}.png';temp.parent.mkdir(exist_ok=True);pix.save(temp)
    cache=ROOT.parent/'catalog-analysis'/f'ocr-{hashlib.sha256((ROOT / "sources/catalogs/travesseiros.pdf").read_bytes()).hexdigest()[:16]}-{page}.txt'
    if cache.exists(): result=cache.read_text()
    else:
        result=subprocess.run(['tesseract',str(temp),'stdout','-l','eng'],capture_output=True,text=True,check=True,env={**os.environ,'OMP_THREAD_LIMIT':'1'}).stdout
        cache.write_text(result)
    # A separate commercial entry supplies searchable, selectable measures and description.
    ref={3:114,4:114,5:115,6:115,7:116,8:116,9:117,10:117,11:118,12:118,13:119,14:119,15:120}[page]
    original=docs['comercial'][ref-1].get_text()
    paragraphs=[clean(b[4]) for b in docs['comercial'][ref-1].get_text('blocks') if clean(b[4]).startswith('O Travesseiro '+name)]
    w,h=p.rect.width,p.rect.height
    q=add('travesseiros',page,'Travesseiro '+name,'Travesseiros',text_override='\n\n'.join(paragraphs) or f'Travesseiro Ortobom {name}. Veja composição e medidas no catálogo original.',clip=fitz.Rect(w*.15,h*.23,w*.88,h*.62))
    q['sourceText']=clean(result); q['sizes']=['50 × 130 cm'] if name=='Aman' else ['45 × 65 cm'] if name in ['Flocos','Casadinho'] else ['50 × 90 cm'] if name=='Orthotel Percal' else ['40 × 60 cm'] if name in ['Espuma Látex','Espuma Viscoelástica','Nuvem'] else ['50 × 70 cm']
    q['specs']['Medidas']=' · '.join(q['sizes'])
# Unique older product family; no unsupported color claims.
for page,name in [(10,'Elegant Superpocket'),(11,'Elegant Nanolastic'),(13,'Light Superpocket'),(14,'Light Nanolastic'),(15,'Light D45'),(16,'Light D33'),(17,'Light D28'),(18,'Light D23'),(45,'Cabeceira Velluto')]: add('revendedor-2021',page,name,'Cabeceiras' if page==45 else 'Colchões')
# Additional products on multi-product pages use distinct source crops.
q=add('comercial',102,'Colchão Hospitalar Ortobom','Acessórios')
q['sizes']=['D20 · 78 × 188 × 12 cm','D26 · 88 × 188 × 12 cm','D28 · 88 × 188 × 12 cm','D33 · 88 × 188 × 12 cm','D45 · 88 × 188 × 12 cm']
q=add('comercial',107,'Colchonete Alveolado','Acessórios')
q['sizes']=['Azul D28 · 190 × 80 × 7 cm','Cinza D20 · 190 × 80 × 7 cm','Cinza D33 · 190 × 80 × 3 cm']
for name,rect,suffix,desc in [
 ('Protetor de Colchão Impermeável',fitz.Rect(22,100,192,222),'-protetor','O Protetor de Colchão Impermeável protege o colchão contra líquidos, suor e impurezas. Tecido em poliéster com tratamento em poliuretano e revestimento lateral em poliéster.'),
 ('Saia Babado para Cama Box',fitz.Rect(20,365,215,425),'-saia','A saia babado protege e proporciona acabamento à cama box. Tecido 50% algodão e 50% poliéster, com acabamento nas laterais em ponto palito.')]:
 q=add('comercial',122,name,'Acessórios',clip=rect,image_suffix=suffix,text_override=desc)
 q['sizes']=['190 × 90 cm','190 × 140 cm','200 × 160 cm','200 × 190 cm']
q=add('comercial',127,'Almofada Roll','Acessórios',clip=fitz.Rect(45,80,350,185),image_suffix='-roll',text_override='Almofada com enchimento em espuma flocada e revestimento em tecido nobuck. Cores do catálogo: bege, cinza, marrom e preto. Consulte a fotografia de outras cores com a loja.')
q['sizes']=['85 × 20 cm','135 × 20 cm','155 × 20 cm']
q=add('comercial',127,'Mini Base para Pet','Acessórios',clip=fitz.Rect(20,367,195,530),image_suffix='-pet',text_override='Base para pet com estrutura interna em madeira e espuma D23. Revestimento em malha com bordado em manta acrílica e espuma. Capacidade de suporte de até 40 kg, conforme o fabricante. Cores do catálogo: bege e marrom; consulte disponibilidade.')
q['sizes']=['45 × 65 cm','60 × 80 cm','80 × 100 cm']
q=add('hotelaria',12,'Base Orthotel Standard Vazada','Hotelaria',clip=fitz.Rect(275,346,556,493),image_suffix='-base',text_override='Base revestida em tecido maquinetado em poliéster e polipropileno, com madeira tratada de reflorestamento e pés rosqueáveis. Colchão e base vendidos separadamente.')
q['sizes']=['200 × 100 × 32 cm']
for q in products:
 if q['id']=='colchao-versatil-orthotel-standard':
  im=photo('hotelaria',12,'-colchao',fitz.Rect(275,178,556,337));q['images']=[im];q['colors'][0]['image']=im
  q['sizes']=['182 × 90 × 26 cm'];q['specs']['Observação']='Colchão e base vendidos separadamente.'
 if q['id']=='cabeceira-velluto':
  positions=[('Cinza','#747474',fitz.Rect(20,145,250,278)),('Crema','#b4a38e',fitz.Rect(285,145,518,278)),('Nero','#222222',fitz.Rect(20,285,250,416)),('Rosolare','#6b4d3a',fitz.Rect(285,285,518,416))]
  q['colors']=[{'name':c,'hex':hx,'image':photo('revendedor-2021',45,'-'+slug(c),r)} for c,hx,r in positions];q['images']=[c['image'] for c in q['colors']]
 # Measures in the concise specification must match the actual selector.
 q['specs']['Medidas']=' · '.join(q['sizes'])

q=add('hotelaria',13,'Travesseiro Pluma','Travesseiros',clip=fitz.Rect(396,213,541,306),image_suffix='-pluma',text_override='Travesseiro com revestimento em tecido 100% algodão e enchimento 100% poliéster, fibra de pluma siliconada. Produto inodoro e antifungo, conforme catálogo de hotelaria 2024.')
q['sizes']=['50 × 70 cm'];q['specs']['Medidas']='50 × 70 cm'
q=add('hotelaria',13,'Capa para Colchão Union','Acessórios',clip=fitz.Rect(394,406,544,501),image_suffix='-union',text_override='Capa com matelassê bordado. Transforma a composição de dois colchões solteiro em uma composição de casal, conforme o fabricante. Consulte compatibilidade e medidas com a loja.')
q['sizes']=['Consultar compatibilidade'];q['specs']['Medidas']='Consultar compatibilidade'
q=add('revendedor-2021',54,'Conjugado Prime Spring','Bases e camas')

cover=docs['hotelaria'][0]
# Extract the underlying room photograph without the PDF's overlaid text.
from PIL import Image
from io import BytesIO
raw=docs['hotelaria'].extract_image(cover.get_images()[0][0])
background=Image.open(BytesIO(raw['image']))
background=background.crop((0,270,background.width,min(745,background.height)))
background.save(out/'hotelaria-1-ambiente.webp','WEBP',quality=90)
(ROOT/'data/catalog.json').write_text(json.dumps(products,ensure_ascii=False,indent=2))
report={'count':len(products),'sources':[{'name':key,'pages':len(d),'url':'/catalogos/'+key+'.pdf'} for key,d in docs.items()],'note':'Preços e estoque não fornecidos. Medidas transcritas do catálogo; fotos por cor somente quando existem na fonte. Disponibilidade atual e combinações de altura/medida precisam ser conferidas pela loja.'}
(ROOT/'data/import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
