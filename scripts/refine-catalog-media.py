"""Extract embedded manufacturer images without PDF captions; never synthesize products."""
import json
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'sources/catalogs'
OUT = ROOT / 'public/catalogo'
catalog = json.loads((ROOT / 'data/catalog.json').read_text())
docs = {key: fitz.open(SOURCE / (key + '.pdf')) for key in ['comercial','hotelaria','travesseiros','revendedor-2021']}
manifest_path=ROOT/'data/media-refinement.json'
previous_manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest = {}

def embedded_photo(key, page, region=None, suffix='-produto'):
    doc = docs[key]
    p = doc[page-1]
    entries = []
    for image in p.get_images(full=True):
        for rect in p.get_image_rects(image[0]):
            if region:
                selected = rect.intersects(region) and rect.width > 25 and rect.height > 20
            else:
                selected = image[2] >= 300 and image[3] >= 100 and rect.height < p.rect.height * .8 and 40 < rect.y0 < p.rect.height * .7
            if selected:
                entries.append((image,rect))
    inline = []
    if not entries:
        # Some catalog pages store the real photograph as inline image tiles,
        # absent from get_images(). Extract those bytes rather than rendering captions.
        for block in p.get_text('dict')['blocks']:
            if block['type'] != 1: continue
            rect=fitz.Rect(block['bbox'])
            if region:
                selected=rect.intersects(region) and rect.width>25 and rect.height>20
            else:
                selected=block['width']>=240 and block['height']>=80 and rect.width>35 and rect.height<p.rect.height*.8 and 40<rect.y0<p.rect.height*.7
            if selected:
                inline.append((block,rect))
        if not inline: return None
        if not region:
            region=fitz.Rect(min(inline,key=lambda e:e[1].y0)[1])
            for _ in range(len(inline)):
                for block,rect in inline:
                    if rect.intersects(region+(-2,-2,2,2)): region |= rect
    if not region:
        # A photograph can be stored in multiple contiguous PDF image tiles.
        anchor = min(entries,key=lambda e:e[1].y0)
        region = fitz.Rect(anchor[1])
        selected = [anchor]
        for _ in range(len(entries)):
            for entry in entries:
                if entry not in selected and entry[1].intersects(region + (-2,-2,2,2)):
                    region |= entry[1]
                    selected.append(entry)
        entries = selected
    blank = fitz.open()
    target = blank.new_page(width=p.rect.width,height=p.rect.height)
    for block,rect in inline:
        if rect.intersects(region): target.insert_image(rect,stream=block['image'])
    for image,rect in entries:
        pix = fitz.Pixmap(doc,image[0])
        if pix.colorspace and pix.colorspace.n > 3:
            pix = fitz.Pixmap(fitz.csRGB,pix)
        if image[1]:
            pix = fitz.Pixmap(pix,fitz.Pixmap(doc,image[1]))
        target.insert_image(rect,stream=pix.tobytes('png'))
    pix = target.get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=region & p.rect,alpha=False)
    # Transcode only: the underlying manufacturer's pixels and printed packaging remain intact.
    from PIL import Image
    im = Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im.thumbnail((1600,1200))
    name=f'{key}-{page}{suffix}.webp'
    im.save(OUT/name,'WEBP',quality=92)
    return '/catalogo/'+name

pillow_regions = {
  'travesseiro-espuma-latex':(114,fitz.Rect(31,100,188,220)),
  'travesseiro-espuma-viscoelastica':(114,fitz.Rect(33,363,196,476)),
  'travesseiro-nuvem':(115,fitz.Rect(41,99,194,207)),
  'travesseiro-flocos':(115,fitz.Rect(39,358,199,466)),
  'travesseiro-max-malha':(116,fitz.Rect(36,108,194,214)),
  'travesseiro-percal-200-fios':(116,fitz.Rect(43,353,179,449)),
  'travesseiro-amore':(117,fitz.Rect(39,93,195,217)),
  'travesseiro-aman':(117,fitz.Rect(38,349,245,431)),
  'travesseiro-percal-200-fios-plus':(118,fitz.Rect(27,102,158,206)),
  'travesseiro-high-comfort':(118,fitz.Rect(27,355,172,456)),
  'travesseiro-casadinho':(119,fitz.Rect(32,355,176,445)),
}
for product in catalog:
    old = list(product['images'])
    replacements = dict(previous_manifest.get(product['id'],{}).get('replacements',{}))
    for image in old:
        # Existing carefully selected multi-product crops must not be replaced by another product.
        import re
        match = re.fullmatch(r'/catalogo/(comercial|hotelaria)-(\d+)\.webp',image)
        if match:
            new = embedded_photo(match[1],int(match[2]))
            if new:
                replacements[image]=new
    if product['id'] in pillow_regions:
        page,region = pillow_regions[product['id']]
        new=embedded_photo('comercial',page,region,suffix='-'+product['id'])
        if new: replacements[old[0]]=new
        product['photoNote']='O fabricante forneceu foto deste modelo na embalagem. Ainda não há foto confirmada sem embalagem.'
    elif product['id']=='travesseiro-orthotel-percal':
        p=docs['hotelaria'][13]
        images=[(im,r) for im in p.get_images(full=True) for r in p.get_image_rects(im[0]) if r.y0<220 and r.x0>200]
        if images:
            region=images[0][1]
            replacements[old[0]]=embedded_photo('hotelaria',14,region,'-travesseiro-orthotel-percal')
        product['photoNote']='Fotografia do Travesseiro Orthotel Percal 200 Fios, fornecida pelo fabricante.'
    elif product['category']=='Travesseiros':
        product['photoNote']='Foto da embalagem deste modelo, fornecida pelo fabricante.'
    product['images']=list(dict.fromkeys(replacements.get(im,im) for im in old))
    for color in product['colors']:
        color['image']=replacements.get(color['image'],color['image'])
    # These two source image strips are actual close-ups of this exact mattress.
    extras=[]
    if product['id']=='colchao-ortobom-physical-nanolastic':
        detail=embedded_photo('comercial',41,fitz.Rect(20.8,266.6,382.8,330.1),'-detalhes')
        extras=[detail] if detail else []
        product['images']=list(dict.fromkeys(product['images']+extras))
    # Readable comparison specifications, transcribed from the actual source text.
    text=product.get('sourceText','')
    specs=product['specs']
    height=re.search(r'Altura\s*[:–-]?\s*(\d{1,2})\s*cm',text,re.I) or re.search(r'(\d{1,2})\s*cm\s*(?:de\s*)?altura',text,re.I)
    if height: specs['Altura']=height.group(1)+' cm'
    capacity=re.search(r'(?:suport\w*|capacidade)[^.;]{0,75}?\b(\d{2,3})\s*(?:kg|quilos)',text,re.I)
    if capacity: specs['Suporta até']=capacity.group(1)+' kg'
    for word in ['Superpocket','Nanolastic','LFK','Pocket','Progressive']:
        if word.lower() in text.lower() and product['category'] in ['Colchões','Hotelaria']:
            specs['Estrutura de molas']=word
            break
    density=re.search(r'\bespuma\s*(?:de\s*)?(?:densidade\s*)?(D\s*\d{2})\b',text,re.I)
    if density: specs['Espuma']=density.group(1).replace(' ','').upper()
    material=re.search(r'•\s*(?:Revestimento|Tecido)\s+(?:em\s+)?([^.;]{5,200})',text,re.I)
    if material: specs['Material']=material.group(1).strip()
    elif product['category']=='Travesseiros': specs['Material']='Consulte a composição na descrição'
    manifest[product['id']]={'replacements':replacements,'extras':extras,'photoNote':product.get('photoNote'),'specs':specs}
    if product.get('source'): product['source'].pop('url',None)

(ROOT/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
(ROOT/'data/media-refinement.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Revisados',len(catalog),'produtos; imagens reais extraídas sem legendas sobrepostas do PDF.')
