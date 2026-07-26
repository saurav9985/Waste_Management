const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/complaints/')),
  filename: (req, file, cb) => {
    const uniqueName = `complaint_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /\.(jpe?g|png|webp)$/i.test(file.originalname);
  if (ok) cb(null, true);
  else cb(new Error('Only JPEG, PNG, or WebP images are allowed.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
