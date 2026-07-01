-- Ajout du statut 'en_attente' et 'refuse' à la contrainte CHECK de boutiques.status
-- Le statut 'en_attente' permet le flux inscription → approbation admin SaaS

ALTER TABLE public.boutiques
  DROP CONSTRAINT IF EXISTS boutiques_status_check;

ALTER TABLE public.boutiques
  ADD CONSTRAINT boutiques_status_check
  CHECK (status IN ('Essai', 'Actif', 'Suspendu', 'en_attente', 'refuse'));
