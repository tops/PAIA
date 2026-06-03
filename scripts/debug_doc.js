import https from 'https';

const url = 'https://data.riksdagen.se/dokumentlista/?sok=artificiell+intelligens&doktyp=mot&utformat=json&sz=1';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const doc = data.dokumentlista.dokument[0];
      console.log('Motion titel:', doc.titel);
      console.log('Motion undertitel:', doc.undertitel);
      console.log('Motion dokintressent:', JSON.stringify(doc.dokintressent, null, 2));
    } catch(e) {
      console.error('Error:', e.message);
    }
  });
});
