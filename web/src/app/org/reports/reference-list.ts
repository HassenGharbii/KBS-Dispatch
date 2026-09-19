// Web-side copy of src/constants/referenceList.ts (mobile). Static data,
// not shared across the two separate projects — 8 fixed categories, 55
// fixed items, per spec annex §7. Codes are stable and only ever added to.

export type CategoryCode =
  | "intrusion"
  | "alarmes"
  | "incendie"
  | "personnes"
  | "vehicules"
  | "controle_site"
  | "degradations_vols"
  | "interventions_exterieures";

export interface ReferenceItem {
  code: string;
  label: string;
}

export interface ReferenceCategory {
  code: CategoryCode;
  label: string;
  order: number;
  items: ReferenceItem[];
}

export const REFERENCE_LIST: ReferenceCategory[] = [
  {
    code: "intrusion",
    label: "Intrusion / tentative d'intrusion",
    order: 1,
    items: [
      { code: "intrusion.personne_non_autorisee", label: "Présence d'une personne non autorisée" },
      { code: "intrusion.tentative_escalade_cloture", label: "Tentative d'escalade de clôture" },
      { code: "intrusion.individu_suspect", label: "Individu suspect repéré sur le site" },
      { code: "intrusion.porte_portail_force", label: "Porte ou portail forcé" },
      { code: "intrusion.intrusion_averee", label: "Intrusion avérée" },
      { code: "intrusion.vehicule_suspect", label: "Véhicule suspect à proximité" },
    ],
  },
  {
    code: "alarmes",
    label: "Alarmes",
    order: 2,
    items: [
      { code: "alarmes.alarme_intrusion", label: "Déclenchement d'une alarme intrusion" },
      { code: "alarmes.alarme_technique", label: "Alarme technique" },
      { code: "alarmes.perte_communication", label: "Perte de communication avec le système d'alarme" },
      { code: "alarmes.alarme_incendie", label: "Alarme incendie" },
      { code: "alarmes.alarme_temperature", label: "Alarme température / chambre froide" },
      { code: "alarmes.declenchements_repetes", label: "Déclenchements répétés ou intempestifs" },
    ],
  },
  {
    code: "incendie",
    label: "Incendie / risques techniques",
    order: 3,
    items: [
      { code: "incendie.depart_de_feu", label: "Départ de feu" },
      { code: "incendie.detection_sans_feu", label: "Détection incendie sans feu apparent" },
      { code: "incendie.fuite_de_gaz", label: "Fuite de gaz" },
      { code: "incendie.defaillance_equipement", label: "Défaillance d'un équipement de sécurité" },
      { code: "incendie.fumee_odeur_brule", label: "Fumée ou odeur de brûlé" },
      { code: "incendie.fuite_eau", label: "Fuite d'eau" },
      { code: "incendie.panne_coupure_electrique", label: "Panne ou coupure électrique" },
    ],
  },
  {
    code: "personnes",
    label: "Personnes",
    order: 4,
    items: [
      { code: "personnes.employe_sans_badge", label: "Employé sans badge" },
      { code: "personnes.refus_obtemperer", label: "Refus d'obtempérer" },
      { code: "personnes.personne_agressive", label: "Personne agressive" },
      { code: "personnes.malaise_accident", label: "Malaise ou accident" },
      { code: "personnes.visiteur_non_autorise", label: "Visiteur non autorisé" },
      { code: "personnes.conflit_altercation", label: "Conflit ou altercation" },
      { code: "personnes.etat_ivresse", label: "Personne en état d'ivresse" },
      { code: "personnes.necessite_secours", label: "Personne nécessitant l'intervention des secours" },
    ],
  },
  {
    code: "vehicules",
    label: "Véhicules",
    order: 5,
    items: [
      { code: "vehicules.non_autorise", label: "Véhicule non autorisé" },
      { code: "vehicules.abandonne", label: "Véhicule abandonné" },
      { code: "vehicules.degradation", label: "Dégradation d'un véhicule" },
      { code: "vehicules.stationnement_genant", label: "Stationnement gênant" },
      { code: "vehicules.accident_sur_site", label: "Accident sur le site" },
      { code: "vehicules.tentative_acces", label: "Tentative d'accès avec un véhicule non autorisé" },
    ],
  },
  {
    code: "controle_site",
    label: "Contrôle du site",
    order: 6,
    items: [
      { code: "controle_site.porte_laissee_ouverte", label: "Porte laissée ouverte" },
      { code: "controle_site.eclairage_defectueux", label: "Éclairage défectueux" },
      { code: "controle_site.serrure_defectueuse", label: "Serrure défectueuse" },
      { code: "controle_site.camera_defaillante", label: "Caméra de vidéosurveillance défaillante" },
      { code: "controle_site.fenetre_ouverte", label: "Fenêtre ouverte" },
      { code: "controle_site.cloture_endommagee", label: "Clôture endommagée" },
      { code: "controle_site.badge_lecteur_hs", label: "Badge / lecteur de contrôle d'accès hors service" },
      { code: "controle_site.anomalie_ronde", label: "Anomalie constatée lors d'une ronde" },
    ],
  },
  {
    code: "degradations_vols",
    label: "Dégradations / vols",
    order: 7,
    items: [
      { code: "degradations_vols.degradation_materiel", label: "Dégradation de matériel" },
      { code: "degradations_vols.tentative_vol", label: "Tentative de vol" },
      { code: "degradations_vols.effraction", label: "Effraction" },
      { code: "degradations_vols.graffiti_deterioration", label: "Graffiti ou détérioration des locaux" },
      { code: "degradations_vols.vandalisme", label: "Vandalisme" },
      { code: "degradations_vols.vol_constate", label: "Vol constaté" },
      { code: "degradations_vols.disparition_materiel", label: "Disparition de matériel" },
    ],
  },
  {
    code: "interventions_exterieures",
    label: "Interventions extérieures",
    order: 8,
    items: [
      { code: "interventions_exterieures.forces_ordre", label: "Appel aux forces de l'ordre" },
      { code: "interventions_exterieures.samu_secours", label: "Appel au SAMU / secours" },
      { code: "interventions_exterieures.pompiers", label: "Appel aux pompiers" },
      { code: "interventions_exterieures.technicien", label: "Intervention d'un technicien" },
      { code: "interventions_exterieures.responsable_astreinte", label: "Intervention du responsable d'astreinte" },
      { code: "interventions_exterieures.societe_maintenance", label: "Intervention d'une société de maintenance" },
      { code: "interventions_exterieures.levee_de_doute", label: "Levée de doute après déclenchement d'alarme" },
    ],
  },
];
