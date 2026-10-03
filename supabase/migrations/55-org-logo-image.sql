-- 55 - Logo de la empresa subido desde "Mi empresa" y guardado en la base
--      (data URL de imagen reducida a 256 px en el navegador). Solo PNG/JPEG/WEBP
--      en base64 y máximo ~300 KB: evita enlaces externos o texto inyectado.
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_logo_image_check CHECK (
    logo_url IS NULL OR (
      length(logo_url) <= 400000
      AND logo_url ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$'
    )
  );
