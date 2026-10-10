"""Recover native photo resolution and transcribe factual specifications.
Sources are PDFs supplied by the shop. No generated angles, AI details or third-party photos.
Run after importing/refining catalogues; PyMuPDF and Pillow required.
"""
import json,re,hashlib
from pathlib import Path
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/catalogo'
products=json.loads((ROOT/'data/catalog.json').read_text())
docs={key:fitz.open(ROOT/'sources/catalogs'/(key+'.pdf')) for key in ['comercial','travesseiros','hotelaria','revendedor-2021']}
manifest_path=ROOT/'data/catalog-upgrade-v4.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
photo_records=[]

def extract(key,number,region,name,auto=False):
    if (OUT/name).exists():
        with Image.open(OUT/name) as image: dimensions=list(image.size)
        photo_records.append({'file':'/catalogo/'+name,'source':key,'page':number,'pixels':dimensions,'kind':'original manufacturer photo; recovered native resolution'})
        return '/catalogo/'+name
    page=docs[key][number-1]
    blocks=[b for b in page.get_text('dict')['blocks'] if b['type']==1]
    entries=[(im,r) for im in page.get_images(full=True) for r in page.get_image_rects(im[0])]
    if auto:
        candidates=[r for im,r in entries if im[2]>=300 and im[3]>=100 and r.height<page.rect.height*.8 and 40<r.y0<page.rect.height*.7]
        if not candidates: candidates=[fitz.Rect(b['bbox']) for b in blocks if b['width']>=240 and b['height']>=80 and 40<b['bbox'][1]<page.rect.height*.7 and fitz.Rect(b['bbox']).height<page.rect.height*.8]
        if not candidates:return None
        region=fitz.Rect(min(candidates,key=lambda r:r.y0))
        for _ in candidates:
            for r in candidates:
                if r.intersects(region+(-2,-2,2,2)):region|=r
    if region is None:return None
    region=fitz.Rect(region)&page.rect
    density=[]
    selected=[(im,r) for im,r in entries if r.intersects(region)]
    for im,r in selected:density.append(max(im[2]/r.width,im[3]/r.height))
    for b in blocks:
        r=fitz.Rect(b['bbox'])
        if r.intersects(region):density.append(max(b['width']/r.width,b['height']/r.height))
    if not density:return None
    # Recover original pixels; do not upsample the manufacturer's small originals.
    scale=min(max(density),2400/region.width,2000/region.height)
    blank=fitz.open();target=blank.new_page(width=page.rect.width,height=page.rect.height)
    if selected:
        for im,r in selected:
            pix=fitz.Pixmap(docs[key],im[0])
            if pix.colorspace and pix.colorspace.n>3:pix=fitz.Pixmap(fitz.csRGB,pix)
            if im[1] and not pix.alpha:pix=fitz.Pixmap(pix,fitz.Pixmap(docs[key],im[1]))
            target.insert_image(r,stream=pix.tobytes('png'))
    else:
        for b in blocks:
            r=fitz.Rect(b['bbox'])
            if r.intersects(region):target.insert_image(r,stream=b['image'])
    pix=target.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=region,alpha=False)
    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    image.save(OUT/name,'WEBP',quality=96,method=6)
    blank.close()
    photo_records.append({'file':'/catalogo/'+name,'source':key,'page':number,'pixels':[pix.width,pix.height],'kind':'original manufacturer photo; recovered native resolution'})
    return '/catalogo/'+name

# Exact single-product crops, separately reviewed in the source pages.
regions={
 'hotelaria-12-colchao.webp':(275,178,556,337),'hotelaria-12-base.webp':(275,346,556,493),
 'hotelaria-13-pluma.webp':(396,213,541,306),'hotelaria-13-union.webp':(394,406,544,501),
 'hotelaria-14-travesseiro-orthotel-percal.webp':(274.7,49.1,555.6,208.2),
 'comercial-122-protetor.webp':(22,100,192,222),'comercial-122-saia.webp':(20,365,215,425),
 'comercial-127-roll.webp':(45,80,350,185),'comercial-127-pet.webp':(45,320,350,425),
 'comercial-41-detalhes.webp':(20.8,266.6,382.8,330.1),
}
# Native scanned pillow pages: packaging is retained honestly, with no invented unpacked photos.
pillow_regions={3:(51,194,515,503),4:(51,194,515,503),5:(51,194,515,503),6:(51,194,515,503),7:(51,194,515,503),8:(51,194,515,503),9:(12,240,554,454),10:(51,194,515,503),11:(51,194,515,503),12:(51,194,515,503),13:(51,194,515,503),14:(51,194,515,503),15:(51,194,515,503)}
pillow_specs={
 'espuma-viscoelastica':{'Revestimento':'90% algodão e 10% poliéster','Enchimento':'Espuma viscoelástica 100% poliuretano'},
 'espuma-latex':{'Revestimento':'90% algodão e 10% poliéster','Enchimento':'Espuma 100% poliuretano de alta resiliência','Observação':'Espuma com características similares ao látex; não é látex natural.'},
 'flocos':{'Revestimento':'TNT 100% polipropileno, bordado em espuma 100% poliuretano','Enchimento':'Flocos de espuma 100% poliuretano'},
 'nuvem':{'Revestimento':'TNT 100% polipropileno','Enchimento':'Espuma 100% poliuretano de alta resiliência Hiper Soft'},
 'percal-200-fios':{'Revestimento':'Percal 100% algodão','Enchimento':'Fibra siliconada 100% poliéster','Contagem de fios':'200 fios'},
 'max-malha':{'Revestimento':'Malha 100% algodão','Enchimento':'Fibra siliconada 100% poliéster'},
 'aman':{'Revestimento':'100% algodão','Enchimento':'Fibra siliconada 100% poliéster','Formato':'Travesseiro de corpo, 50 × 130 cm'},
 'amore':{'Revestimento':'Microfibra peletizada 100% poliéster','Enchimento':'Fibra siliconada 100% poliéster'},
 'high-comfort':{'Revestimento':'100% algodão','Enchimento':'Fibra siliconada 100% poliéster'},
 'percal-200-fios-plus':{'Revestimento':'Percal 100% algodão','Enchimento':'Fibra siliconada 100% poliéster','Contagem de fios':'200 fios'},
 'casadinho':{'Revestimento':'100% poliéster','Enchimento':'Fibra siliconada','Conteúdo da embalagem':'2 travesseiros'},
 'orthotel-percal':{'Revestimento':'Percal 100% algodão','Enchimento':'Fibra siliconada 100% poliéster','Contagem de fios':'200 fios','Lavável':'Sim, conforme instruções do fabricante'},
 'soneca':{'Revestimento':'TNT 100% polipropileno','Enchimento':'Fibra siliconada 100% poliéster extramacia'},
 'pluma':{'Revestimento':'100% algodão','Enchimento':'100% poliéster, fibra de pluma siliconada','Observação':'Não é enchimento de pluma animal.'},
}
cache={}
for p in products:
    id=p['id'];change=manifest.get(id,{'beforeSpecs':p['specs'].copy(),'beforeDescription':p['description'],'replacements':{},'extras':[]})
    old=list(p['images'])
    for original in old:
        name=Path(original).name
        if '-hd' in name:continue
        if original in cache:new=cache[original]
        else:
            match=re.match(r'(comercial|hotelaria|revendedor-2021|travesseiros)-(\d+)',name)
            new=None
            if match:
                key,number=match.group(1),int(match.group(2));region=regions.get(name)
                if p['category']=='Travesseiros' and p['source']['catalog']=='travesseiros':
                    key,number='travesseiros',p['source']['page'];region=pillow_regions[number]
                elif key=='revendedor-2021':
                    if number==45:
                        region={'cinza':(20,145,250,278),'crema':(285,145,518,278),'nero':(20,285,250,416),'rosolare':(285,285,518,416)}.get(name.rsplit('-',1)[-1].split('.')[0])
                    else:
                        page=docs[key][number-1];region=(page.rect.width*.12,page.rect.height*.22,page.rect.width*.88,page.rect.height*.59)
                new=extract(key,number,region,name[:-5]+'-hd.webp',auto=region is None)
            cache[original]=new
        if new:change['replacements'][original]=new
    p['images']=list(dict.fromkeys(change['replacements'].get(im,im) for im in p['images']))
    for color in p['colors']:color['image']=change['replacements'].get(color['image'],color['image'])
    text=re.sub(r'\s+',' ',p.get('sourceText',''))
    specs=p['specs']
    if p['category']=='Travesseiros':
        specs.pop('Material',None)
        specs.update(pillow_specs[id.removeprefix('travesseiro-')])
        p['description']=p['name']+'. '+'. '.join(f'{k}: {v}' for k,v in specs.items() if k not in ['Linha','Medidas'])+'. Medida: '+', '.join(p['sizes'])+'.'
    else:
        density=re.search(r'\b(?:espuma|poliuretano)\b.{0,60}?\b(D\s*\d{2})\b',text,re.I)
        if density:specs['Espuma']=density.group(1).replace(' ','').upper()
        if p['category'] in ['Colchões','Hotelaria']:
            if 'ensacad' in text.lower():specs['Estrutura de molas']=next((w for w in ['Superpocket','Pocket'] if w.lower() in text.lower()),'Molas ensacadas individualmente')
            if re.search('Pillow Top Touch em espuma viscoelástica',text,re.I):specs['Camada superior']='Pillow Top Touch em espuma viscoelástica'+(' com gel' if re.search('viscoelástica.{0,12}gel',text,re.I) else '')
            heights=re.findall(r'(?:Altura\s*)(\d{1,2})\s*cm',text,re.I)
            if len(set(heights))>1:specs['Alturas no catálogo']=' · '.join(n+' cm' for n in dict.fromkeys(heights));specs.pop('Altura',None)
        if p['category'] in ['Bases e camas','Cabeceiras']:
            if 'madeira de reflorestamento' in text.lower():specs['Estrutura']='Madeira de reflorestamento'
            if 'baú' in p['name'].lower():specs['Armazenamento']='Compartimento baú'
            if 'pneumáticos' in text.lower():specs['Abertura']='Amortecedores pneumáticos'
            if 'rosqueáveis' in text.lower():specs['Pés']='Rosqueáveis'
    # Manufacturer's separate detail photographs, not duplicate crops masquerading as new angles.
    extras=[]
    source=p.get('source',{})
    if source.get('catalog')=='comercial' and source.get('page') in [63,64,65]:
        n=source['page'];box={63:(281,154,354,201),64:(280,160,353,210),65:(282,165,355,216)}[n]
        extra=extract('comercial',n,box,f'comercial-{n}-pes-hd.webp')
        if extra:extras.append(extra)
    if id in ['base-sommier-bau-camurca','base-sommier-bau-corino']:
        for n in ([73,74,75,76] if 'camurca' in id else [77,78,79,80]):
            # Detail positions reviewed for the source pages 73-80.
            for j,box in enumerate([(278,196,339,261),(278,262,339,302)] if n<=76 else [(270,175,338,246),(270,250,338,295)]):
                extra=extract('comercial',n,box,f'comercial-{n}-detalhe-{j+1}-hd.webp')
                if extra:extras.append(extra)
    if id=='colchao-ortobom-physical-nanolastic':
        for j,box in enumerate([(83,266,153,311),(153,266,222,311),(224,266,293,311)]):
            extra=extract('comercial',41,box,f'comercial-41-detalhe-{j+1}-hd.webp')
            if extra:extras.append(extra)
    change['extras']=list(dict.fromkeys(change['extras']+extras));p['images']=list(dict.fromkeys(p['images']+change['extras']))
    change['specs']=specs.copy();change['description']=p['description'];manifest[id]=change
(ROOT/'data/catalog.json').write_text(json.dumps(products,ensure_ascii=False,indent=2))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
prior=json.loads((ROOT/'data/photo-audit.json').read_text()) if (ROOT/'data/photo-audit.json').exists() else {}
unique={r['file']:r for r in prior.get('photos',[])+photo_records}
report={'sources':[{'file':key+'.pdf','sha256':hashlib.sha256((ROOT/'sources/catalogs'/(key+'.pdf')).read_bytes()).hexdigest(),'rights':'Manufacturer catalogue supplied by shop; no third-party web images copied.'} for key in docs],'photos':list(unique.values()),'note':'Resolution is limited by original pixels. Packaging photos are not unwrapped photos. Additional angles require exact authorized originals.'}
(ROOT/'data/photo-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('Atualizados',len(products),'produtos;',len(photo_records),'arquivos em resolução nativa. Sem fotos ou detalhes inventados.')
