const fs = require('fs');

const path = 'components/admin/whatsapp-grupos-panel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<Dialog open={open} onOpenChange={setOpen}>\n      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(true)}>\n        <Link2 className="size-3 mr-1.5" />\n        Vincular grupo\n      </Button>',
  '<>\n      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(true)}>\n        <Link2 className="size-3 mr-1.5" />\n        Vincular grupo\n      </Button>\n      <Dialog open={open} onOpenChange={setOpen}>'
);

content = content.replace('</Dialog>\n  );', '</Dialog>\n    </>\n  );');

fs.writeFileSync(path, content);
