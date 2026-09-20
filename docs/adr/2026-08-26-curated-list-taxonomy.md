# ADR: taxonomie des listes curated

Date: 2026-08-26
Statut: acceptee

## Contexte

ZenPak publiera des listes curated depuis le compte officiel. Ces listes doivent devenir les exemples a copier pour les futures listes publiques.

Les templates actuels ne parlent pas tous la meme langue:

| Template | Problemes actuels |
|---|---|
| 3-Day Backpacking | `Clothing`, `Food & Cook`, `Pack & Essentials` |
| 4-Season Backpacking | `Clothing & Footwear`, `Safety & Navigation`, `Water & Food` |
| PCT Thru-Hike | `Clothing & Footwear`, `Navigation & Safety`, `Water & Food` |
| Weekend Ultralight | `Clothing`, `Food & Cook`, `Pack & Essentials` |

Sans convention, chaque nouvelle liste ajoute sa variante. Le probleme n'est pas technique. Une Category appartient a une List et `Library.copyList` duplique les Categories. La taxonomie curated est donc une convention de noms, d'ordre et de classement des items.

Le Gear Tag d'un Item reste separe. Il sert a filtrer la Gear Room. Il ne dicte pas la Category d'une liste.

## Decision

### Noyau standard

Une liste curated standard utilise ce noyau, dans cet ordre:

1. `Pack`
2. `Shelter`
3. `Sleep System`
4. `Clothing & Footwear`
5. `Water`
6. `Cook & Food`
7. `Hygiene & Health`
8. `Safety & Navigation`
9. `Electronics & Essentials`

`Water` vient avant `Cook & Food`. L'eau est un systeme autonome, pas une sous-partie de la cuisine ou de la nourriture.

Pas de categorie `Divers`. Si un item ne rentre nulle part, on documente une nouvelle categorie ou on corrige le classement.

### Variantes autorisees

| Activite | Categories |
|---|---|
| Weekend, Trek, Thru-Hike, Hiver | Noyau standard |
| Day Hike | Noyau sans `Shelter` ni `Sleep System` |
| Bikepacking | Noyau + `Bike & Repair` apres `Pack` |

L'hiver n'ajoute pas de categorie. Raquettes, crampons, piolet, DVA, pelle et sonde vont dans `Safety & Navigation`.

La liste n'est pas fermee pour toujours. Une nouvelle categorie curated est possible, mais elle doit etre ajoutee a cette ADR avec une raison et des exemples.

### Water

`Water` contient ce qui sert a porter, filtrer, traiter ou boire l'eau.

Exemples:

- gourde
- flasque
- poche a eau
- reservoir
- filtre
- pastilles ou gouttes de traitement
- systeme UV

Une gourde reste dans `Water`, meme si c'est un contenant. Le contenant suit sa fonction.

### Cook & Food

`Cook & Food` contient la nourriture, la cuisson et le stockage lie a la nourriture.

Exemples:

- nourriture
- rechaud
- combustible
- popote
- couverts
- briquet de cuisson
- bear canister
- bear bag utilise pour la nourriture

`Water & Food` est interdit dans une liste curated. A la migration, il faut eclater les items un par un. Hydratation et traitement vont dans `Water`. Nourriture et cuisson vont dans `Cook & Food`.

### Pack

`Pack` contient le portage et les contenants orphelins.

Exemples:

- sac a dos
- banane
- sacoche
- dry bag generaliste
- stuff sack generaliste
- pochette
- organisateur
- trousse vide

Les contenants qui ont une fonction claire suivent cette fonction. Gourde dans `Water`. Popote dans `Cook & Food`. Trousse de secours remplie dans `Hygiene & Health` ou `Safety & Navigation` selon le contenu.

### Shelter

`Shelter` contient le systeme d'abri.

Exemples:

- tente
- tarp
- bivy
- footprint
- sardines
- haubans
- arceaux
- batons dedies au montage
- batons double usage marche + tente

Des qu'un baton est necessaire au montage de l'abri, il va dans `Shelter`.

### Sleep System

`Sleep System` contient ce qui sert a dormir.

Exemples:

- quilt
- sac de couchage
- matelas
- oreiller
- liner
- drap

Les vetements de nuit restent dans `Clothing & Footwear`.

### Clothing & Footwear

`Clothing & Footwear` contient vetements, chaussures et accessoires portes.

Exemples:

- veste
- pantalon
- couche thermique
- chaussettes
- chaussures
- sandales de camp
- guetres
- bonnet
- gants

Pas de categorie `Worn`. Le flag `worn` du Placement porte cette information.

### Hygiene & Health

`Hygiene & Health` contient hygiene, pharmacie et protection du corps non liee a la navigation ou au secours.

Exemples:

- brosse a dents
- dentifrice
- papier toilette
- savon
- creme solaire
- baume levres
- medicaments
- pansements courants

### Safety & Navigation

`Safety & Navigation` contient orientation, secours, feu et reparation generale.

Exemples:

- carte
- boussole
- GPS dedie
- sifflet
- couverture de survie
- fire starter
- couteau
- multitool
- duct tape
- kit de reparation general
- trousse urgence

En bikepacking, la reparation specifique velo va dans `Bike & Repair`. Le reste reste ici.

### Electronics & Essentials

`Electronics & Essentials` doit rester borne. Tout peut sembler essentiel dans un sac, donc cette categorie ne sert pas a ranger ce qu'on ne sait pas classer.

Elle contient:

- telephone
- frontale principale
- batterie externe
- cable
- chargeur
- appareil photo
- montre
- documents
- argent
- cles
- lunettes
- batons de marche uniquement

Une lampe de secours explicitement redondante peut aller dans `Safety & Navigation`. La frontale principale va ici.

## Migration des templates

La migration est un re-tri complet, pas un renommage.

| Ancien nom | Migration |
|---|---|
| `Pack & Essentials` | `Pack` + redistribution vers `Hygiene & Health`, `Electronics & Essentials`, `Safety & Navigation` |
| `Water & Food` | Eclater en `Water` et `Cook & Food` |
| `Food & Cook` | Renommer en `Cook & Food`, apres `Water` |
| `Navigation & Safety` | Renommer en `Safety & Navigation` |
| `Safety & Navigation` | Garder le nom, verifier les items |
| `Clothing` | Renommer en `Clothing & Footwear` |
| `Pack` | Garder le nom, sortir les items qui appartiennent a une fonction claire |
| `Shelter`, `Sleep System`, `Water` | Garder le nom, verifier les items |

La migration doit produire l'ordre canonique. `Water` avant `Cook & Food`, toujours.

## Non-goals

- Pas de champ technique `curated` dans cette ADR. Pour l'instant, curated veut dire liste publiee par le compte officiel ZenPak.
- Pas de hierarchie de categories dans le modele.
- Pas de mapping obligatoire entre Category et Gear Tag.
