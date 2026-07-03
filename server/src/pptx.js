import JSZip from 'jszip';

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// La portada visual no siempre es slide1.xml: el orden real esta definido en
// presentation.xml (sldIdLst) + sus relationships, no por el numero de archivo.
async function getCoverSlidePath(zip) {
  const presentationXml = await zip.file('ppt/presentation.xml').async('string');
  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels').async('string');

  const firstRIdMatch = presentationXml.match(/<p:sldId[^>]*r:id="(rId\d+)"/);
  if (!firstRIdMatch) return null;
  const firstRId = firstRIdMatch[1];

  const relRegex = new RegExp(`<Relationship Id="${firstRId}"[^>]*Target="([^"]*slide\\d+\\.xml)"`);
  const relMatch = relsXml.match(relRegex);
  if (!relMatch) return null;

  return `ppt/${relMatch[1].replace(/^\.?\/?/, '')}`;
}

// Completa el nombre del cliente en la portada solo si hay exactamente un
// placeholder de texto vacio (<a:t></a:t>) - evita romper diseños donde no
// existe ese cuadro de texto o donde hay varios textos ambiguos.
export async function fillClientNameIfPossible(buffer, clientName) {
  const zip = await JSZip.loadAsync(buffer);
  const coverPath = await getCoverSlidePath(zip);
  if (!coverPath || !zip.file(coverPath)) {
    return { buffer, filled: false };
  }

  const xml = await zip.file(coverPath).async('string');
  const emptyRunPattern = /<a:t><\/a:t>/g;
  const emptyRunCount = (xml.match(emptyRunPattern) || []).length;

  if (emptyRunCount !== 1) {
    return { buffer, filled: false };
  }

  const updatedXml = xml.replace(emptyRunPattern, `<a:t>${escapeXml(clientName)}</a:t>`);
  zip.file(coverPath, updatedXml);
  const updatedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { buffer: updatedBuffer, filled: true };
}
