"use strict";
// Catalogue initial ; les modifications publiées sont fusionnées au démarrage.
const COLLECTION = [
  {
    "number": 1,
    "title": "Volume 01",
    "cover": "./cover-01.webp",
    "zip": "https://mega.nz/file/hINBEQ7I#gx_wJx1vw3Dj1AI082V5EI3CBcivSqIHGvDLq-oVd1E",
    "tracks": [
      {
        "number": 1,
        "title": "Marre de tout",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/01%20-%20Marre%20de%20tout.mp3",
        "filename": "1 - Marre de tout.mp3",
        "archiveFilename": "01 - Marre de tout.mp3",
        "genius": {
          "id": "716033",
          "url": "https://genius.com/Jul-marre-de-tout-lyrics"
        }
      },
      {
        "number": 2,
        "title": "Amis ennemis",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/02%20-%20Amis%20ennemis.mp3",
        "filename": "2 - Amis ennemis.mp3",
        "archiveFilename": "02 - Amis ennemis.mp3",
        "genius": {
          "id": "2454708",
          "url": "https://genius.com/Jul-amis-ennemis-lyrics"
        }
      },
      {
        "number": 3,
        "title": "Dans mon secteur",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/03%20-%20Dans%20mon%20secteur.mp3",
        "filename": "3 - Dans mon secteur.mp3",
        "archiveFilename": "03 - Dans mon secteur.mp3",
        "genius": null
      },
      {
        "number": 4,
        "title": "Doublesse",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/04%20-%20Doublesse.mp3",
        "filename": "4 - Doublesse.mp3",
        "archiveFilename": "04 - Doublesse.mp3",
        "genius": {
          "id": "13782053",
          "url": "https://genius.com/Jul-doublesse-lyrics"
        }
      },
      {
        "number": 5,
        "title": "Drogue love",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/05%20-%20Drogue%20love.mp3",
        "filename": "5 - Drogue love.mp3",
        "archiveFilename": "05 - Drogue love.mp3",
        "genius": {
          "id": "417325",
          "url": "https://genius.com/Jul-drogue-love-lyrics"
        }
      },
      {
        "number": 6,
        "title": "Écoute ça",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/06%20-%20%C3%89coute%20%C3%A7a.mp3",
        "filename": "6 - Écoute ça.mp3",
        "archiveFilename": "06 - Écoute ça.mp3",
        "genius": {
          "id": "6892382",
          "url": "https://genius.com/Jul-ecoute-ca-lyrics"
        }
      },
      {
        "number": 7,
        "title": "Freestyle boos",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/07%20-%20Freestyle%20boos.mp3",
        "filename": "7 - Freestyle boos.mp3",
        "archiveFilename": "07 - Freestyle boos.mp3",
        "genius": {
          "id": "2402565",
          "url": "https://genius.com/Jul-freestyle-boos-lyrics"
        }
      },
      {
        "number": 8,
        "title": "J’ai trop parlé",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/08%20-%20J%E2%80%99ai%20trop%20parl%C3%A9.mp3",
        "filename": "8 - J’ai trop parlé.mp3",
        "archiveFilename": "08 - J’ai trop parlé.mp3",
        "genius": {
          "id": "2315083",
          "url": "https://genius.com/Jul-jai-trop-parle-lyrics"
        }
      },
      {
        "number": 9,
        "title": "Kalashnijul",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/09%20-%20Kalashnijul.mp3",
        "filename": "9 - Kalashnijul.mp3",
        "archiveFilename": "09 - Kalashnijul.mp3",
        "genius": {
          "id": "513980",
          "url": "https://genius.com/Jul-kalashnijul-lyrics"
        }
      },
      {
        "number": 10,
        "title": "La vie est courte",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/10%20-%20La%20vie%20est%20courte.mp3",
        "filename": "10 - La vie est courte.mp3",
        "archiveFilename": "10 - La vie est courte.mp3",
        "genius": {
          "id": "521821",
          "url": "https://genius.com/Jul-la-vie-est-courte-lyrics"
        }
      },
      {
        "number": 11,
        "title": "2 visages",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/11%20-%202%20visages.mp3",
        "filename": "11 - 2 visages.mp3",
        "archiveFilename": "11 - 2 visages.mp3",
        "genius": {
          "id": "8204861",
          "url": "https://genius.com/Jul-2-visages-lyrics"
        }
      },
      {
        "number": 12,
        "title": "Lacrizeomic 2",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/12%20-%20Lacrizeomic%202.mp3",
        "filename": "12 - Lacrizeomic 2.mp3",
        "archiveFilename": "12 - Lacrizeomic 2.mp3",
        "genius": {
          "id": "695731",
          "url": "https://genius.com/Jul-lacrizeomic-2-lyrics"
        }
      },
      {
        "number": 13,
        "title": "Marseille-Toulouse ( feat.Sarrazin )",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/13%20-%20Marseille-Toulouse%20%28%20feat.Sarrazin%20%29.mp3",
        "filename": "13 - Marseille-Toulouse ( feat.Sarrazin ).mp3",
        "archiveFilename": "13 - Marseille-Toulouse ( feat.Sarrazin ).mp3",
        "genius": {
          "id": "2282880",
          "url": "https://genius.com/Jul-marseille-toulouse-lyrics"
        }
      },
      {
        "number": 14,
        "title": "Sans sous",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/14%20-%20Sans%20sous.mp3",
        "filename": "14 - Sans sous.mp3",
        "archiveFilename": "14 - Sans sous.mp3",
        "genius": {
          "id": "563279",
          "url": "https://genius.com/Jul-sans-sous-lyrics"
        }
      },
      {
        "number": 15,
        "title": "V2F",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/15%20-%20V2F.mp3",
        "filename": "15 - V2F.mp3",
        "archiveFilename": "15 - V2F.mp3",
        "genius": {
          "id": "2369077",
          "url": "https://genius.com/Jul-v2f-lyrics"
        }
      },
      {
        "number": 16,
        "title": "1.3.5 city",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/16%20-%201.3.5%20city.mp3",
        "filename": "16 - 1.3.5 city.mp3",
        "archiveFilename": "16 - 1.3.5 city.mp3",
        "genius": {
          "id": "1778338",
          "url": "https://genius.com/Jul-135-city-lyrics"
        }
      },
      {
        "number": 17,
        "title": "En live de périscope",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/17%20-%20En%20live%20de%20p%C3%A9riscope.mp3",
        "filename": "17 - En live de périscope.mp3",
        "archiveFilename": "17 - En live de périscope.mp3",
        "genius": {
          "id": "2420504",
          "url": "https://genius.com/Jul-en-live-de-periscope-lyrics"
        }
      },
      {
        "number": 18,
        "title": "À croire que",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/18%20-%20%C3%80%20croire%20que.mp3",
        "filename": "18 - À croire que.mp3",
        "archiveFilename": "18 - À croire que.mp3",
        "genius": {
          "id": "2334794",
          "url": "https://genius.com/Jul-a-croire-que-lyrics"
        }
      },
      {
        "number": 19,
        "title": "Bonne année",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/19%20-%20Bonne%20ann%C3%A9e.mp3",
        "filename": "19 - Bonne année.mp3",
        "archiveFilename": "19 - Bonne année.mp3",
        "genius": {
          "id": "4196891",
          "url": "https://genius.com/Jul-bonne-annee-lyrics"
        }
      },
      {
        "number": 20,
        "title": "Vroum Vroum",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/20%20-%20Vroum%20Vroum.mp3",
        "filename": "20 - Vroum Vroum.mp3",
        "archiveFilename": "20 - Vroum Vroum.mp3",
        "genius": {
          "id": "2262893",
          "url": "https://genius.com/Jul-vroum-vroum-lyrics"
        }
      },
      {
        "number": 21,
        "title": "À coup de taser",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/21%20-%20%C3%80%20coup%20de%20taser.mp3",
        "filename": "21 - À coup de taser.mp3",
        "archiveFilename": "21 - À coup de taser.mp3",
        "genius": {
          "id": "2332962",
          "url": "https://genius.com/Jul-a-coup-de-taser-lyrics"
        }
      },
      {
        "number": 22,
        "title": "Va là-bas",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/22%20-%20Va%20l%C3%A0-bas.mp3",
        "filename": "22 - Va là-bas.mp3",
        "archiveFilename": "22 - Va là-bas.mp3",
        "genius": {
          "id": "2332232",
          "url": "https://genius.com/Jul-va-la-bas-lyrics"
        }
      },
      {
        "number": 23,
        "title": "Comprendo Señorita",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/23%20-%20Comprendo%20Se%C3%B1orita.mp3",
        "filename": "23 - Comprendo Señorita.mp3",
        "archiveFilename": "23 - Comprendo Señorita.mp3",
        "genius": {
          "id": "4230116",
          "url": "https://genius.com/Jul-comprendo-senorita-lyrics"
        }
      },
      {
        "number": 24,
        "title": "Je suis bleu",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/24%20-%20Je%20suis%20bleu.mp3",
        "filename": "24 - Je suis bleu.mp3",
        "archiveFilename": "24 - Je suis bleu.mp3",
        "genius": {
          "id": "2426536",
          "url": "https://genius.com/Jul-je-suis-bleu-lyrics"
        }
      },
      {
        "number": 25,
        "title": "Sangoku",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/25%20-%20Sangoku.mp3",
        "filename": "25 - Sangoku.mp3",
        "archiveFilename": "25 - Sangoku.mp3",
        "genius": {
          "id": "2406483",
          "url": "https://genius.com/Jul-sangoku-lyrics"
        }
      },
      {
        "number": 26,
        "title": "Loin du ghetto",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/26%20-%20Loin%20du%20ghetto.mp3",
        "filename": "26 - Loin du ghetto.mp3",
        "archiveFilename": "26 - Loin du ghetto.mp3",
        "genius": {
          "id": "4196825",
          "url": "https://genius.com/Jul-loin-du-ghetto-lyrics"
        }
      },
      {
        "number": 27,
        "title": "Comme une machine",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/27%20-%20Comme%20une%20machine.mp3",
        "filename": "27 - Comme une machine.mp3",
        "archiveFilename": "27 - Comme une machine.mp3",
        "genius": {
          "id": "2406473",
          "url": "https://genius.com/Jul-comme-une-machine-lyrics"
        }
      },
      {
        "number": 28,
        "title": "De retour",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/28%20-%20De%20retour.mp3",
        "filename": "28 - De retour.mp3",
        "archiveFilename": "28 - De retour.mp3",
        "genius": {
          "id": "2406323",
          "url": "https://genius.com/Jul-de-retour-lyrics"
        }
      },
      {
        "number": 29,
        "title": "Marseille",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/29%20-%20Marseille.mp3",
        "filename": "29 - Marseille.mp3",
        "archiveFilename": "29 - Marseille.mp3",
        "genius": {
          "id": "459254",
          "url": "https://genius.com/Jul-marseille-lyrics"
        }
      },
      {
        "number": 30,
        "title": "Je fais ma vie",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/30%20-%20Je%20fais%20ma%20vie.mp3",
        "filename": "30 - Je fais ma vie.mp3",
        "archiveFilename": "30 - Je fais ma vie.mp3",
        "genius": {
          "id": "2822441",
          "url": "https://genius.com/Jul-je-fais-ma-vie-lyrics"
        }
      },
      {
        "number": 31,
        "title": "Que ça me critique",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/31%20-%20Que%20%C3%A7a%20me%20critique.mp3",
        "filename": "31 - Que ça me critique.mp3",
        "archiveFilename": "31 - Que ça me critique.mp3",
        "genius": {
          "id": "2333105",
          "url": "https://genius.com/Jul-que-ca-me-critique-lyrics"
        }
      },
      {
        "number": 32,
        "title": "Appelles-nous ( feat.Adeal )",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/32%20-%20Appelles-nous%20%28%20feat.Adeal%20%29.mp3",
        "filename": "32 - Appelles-nous ( feat.Adeal ).mp3",
        "archiveFilename": "32 - Appelles-nous ( feat.Adeal ).mp3",
        "genius": {
          "id": "8204344",
          "url": "https://genius.com/Jul-appel-nous-lyrics"
        }
      },
      {
        "number": 33,
        "title": "Du love à la rage",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/33%20-%20Du%20love%20%C3%A0%20la%20rage.mp3",
        "filename": "33 - Du love à la rage.mp3",
        "archiveFilename": "33 - Du love à la rage.mp3",
        "genius": {
          "id": "3859671",
          "url": "https://genius.com/Jul-du-love-a-la-rage-lyrics"
        }
      },
      {
        "number": 34,
        "title": "Essaie de nous suivre ( feat. 12mm )",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/34%20-%20Essaie%20de%20nous%20suivre%20%28%20feat.%2012mm%20%29.mp3",
        "filename": "34 - Essaie de nous suivre ( feat. 12mm ).mp3",
        "archiveFilename": "34 - Essaie de nous suivre ( feat. 12mm ).mp3",
        "genius": null
      },
      {
        "number": 35,
        "title": "Je suis perdu",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/35%20-%20Je%20suis%20perdu.mp3",
        "filename": "35 - Je suis perdu.mp3",
        "archiveFilename": "35 - Je suis perdu.mp3",
        "genius": {
          "id": "2321309",
          "url": "https://genius.com/Jul-je-suis-perdu-lyrics"
        }
      },
      {
        "number": 36,
        "title": "On sait jamais ( feat.fabio )",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/36%20-%20On%20sait%20jamais%20%28%20feat.fabio%20%29.mp3",
        "filename": "36 - On sait jamais ( feat.fabio ).mp3",
        "archiveFilename": "36 - On sait jamais ( feat.fabio ).mp3",
        "genius": null
      },
      {
        "number": 37,
        "title": "Mon son vient d’ailleurs - version instrumentale ( bonus track )",
        "artist": "JuL",
        "src": "https://archive.org/download/12-lacrizeomic-2/37%20-%20Mon%20son%20vient%20d%E2%80%99ailleurs%20-%20version%20instrumentale%20%28%20bonus%20track%20%29.mp3",
        "filename": "37 - Mon son vient d’ailleurs - version instrumentale ( bonus track ).mp3",
        "archiveFilename": "37 - Mon son vient d’ailleurs - version instrumentale ( bonus track ).mp3",
        "genius": null
      }
    ],
    "motion": "./pochette-animee-01.mp4"
  },
  {
    "number": 2,
    "title": "Volume 02",
    "cover": "./cover-02.webp",
    "zip": "https://mega.nz/file/8FcG0Z4Q#b1JLW2QanBTI5cgDjNWF_vnyEuv38532jRxVLb6sRDs",
    "tracks": [
      {
        "number": 1,
        "title": "Posé à la place ( feat.Saiah )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/01%20-%20Pos%C3%A9%20%C3%A0%20la%20place%20%28%20feat.Saiah%20%29.mp3",
        "filename": "1 - Posé à la place ( feat.Saiah ).mp3",
        "archiveFilename": "01 - Posé à la place ( feat.Saiah ).mp3",
        "genius": null
      },
      {
        "number": 2,
        "title": "Avant d’dodo",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/02%20-%20Avant%20d%E2%80%99dodo.mp3",
        "filename": "2 - Avant d’dodo.mp3",
        "archiveFilename": "02 - Avant d’dodo.mp3",
        "genius": null
      },
      {
        "number": 3,
        "title": "Generation õng back",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/03%20-%20Generation%20%C3%B5ng%20back.mp3",
        "filename": "3 - Generation õng back.mp3",
        "archiveFilename": "03 - Generation õng back.mp3",
        "genius": null
      },
      {
        "number": 4,
        "title": "J’vois les schmitts en 307",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/04%20-%20J%E2%80%99vois%20les%20schmitts%20en%20307.mp3",
        "filename": "4 - J’vois les schmitts en 307.mp3",
        "archiveFilename": "04 - J’vois les schmitts en 307.mp3",
        "genius": null
      },
      {
        "number": 5,
        "title": "J’déballe ma vie",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/05%20-%20J%E2%80%99d%C3%A9balle%20ma%20vie.mp3",
        "filename": "5 - J’déballe ma vie.mp3",
        "archiveFilename": "05 - J’déballe ma vie.mp3",
        "genius": null
      },
      {
        "number": 6,
        "title": "1.3.5 Air bel ( feat.Nino & Skizz )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/06%20-%201.3.5%20Air%20bel%20%28%20feat.Nino%20%26%20Skizz%20%29.mp3",
        "filename": "6 - 1.3.5 Air bel ( feat.Nino & Skizz ).mp3",
        "archiveFilename": "06 - 1.3.5 Air bel ( feat.Nino & Skizz ).mp3",
        "genius": null
      },
      {
        "number": 7,
        "title": "Arrête de faire ta folle",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/07%20-%20Arr%C3%AAte%20de%20faire%20ta%20folle.mp3",
        "filename": "7 - Arrête de faire ta folle.mp3",
        "archiveFilename": "07 - Arrête de faire ta folle.mp3",
        "genius": null
      },
      {
        "number": 8,
        "title": "Baby",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/08%20-%20Baby.mp3",
        "filename": "8 - Baby.mp3",
        "archiveFilename": "08 - Baby.mp3",
        "genius": null
      },
      {
        "number": 9,
        "title": "Bing bing",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/09%20-%20Bing%20bing.mp3",
        "filename": "9 - Bing bing.mp3",
        "archiveFilename": "09 - Bing bing.mp3",
        "genius": null
      },
      {
        "number": 10,
        "title": "C’est la crise",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/10%20-%20C%E2%80%99est%20la%20crise.mp3",
        "filename": "10 - C’est la crise.mp3",
        "archiveFilename": "10 - C’est la crise.mp3",
        "genius": null
      },
      {
        "number": 11,
        "title": "Formidable",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/11%20-%20Formidable.mp3",
        "filename": "11 - Formidable.mp3",
        "archiveFilename": "11 - Formidable.mp3",
        "genius": null
      },
      {
        "number": 12,
        "title": "Dans mon dél à l’aise",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/12%20-%20Dans%20mon%20d%C3%A9l%20%C3%A0%20l%E2%80%99aise.mp3",
        "filename": "12 - Dans mon dél à l’aise.mp3",
        "archiveFilename": "12 - Dans mon dél à l’aise.mp3",
        "genius": null
      },
      {
        "number": 13,
        "title": "Dounia",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/13%20-%20Dounia.mp3",
        "filename": "13 - Dounia.mp3",
        "archiveFilename": "13 - Dounia.mp3",
        "genius": null
      },
      {
        "number": 14,
        "title": "Dure d’y croire ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/14%20-%20Dure%20d%E2%80%99y%20croire%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "14 - Dure d’y croire ( feat.non crédité ).mp3",
        "archiveFilename": "14 - Dure d’y croire ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 15,
        "title": "C’est la seule",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/15%20-%20C%E2%80%99est%20la%20seule.mp3",
        "filename": "15 - C’est la seule.mp3",
        "archiveFilename": "15 - C’est la seule.mp3",
        "genius": null
      },
      {
        "number": 16,
        "title": "I’m desperate to get out ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/16%20-%20I%E2%80%99m%20desperate%20to%20get%20out%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "16 - I’m desperate to get out ( feat.non crédité ).mp3",
        "archiveFilename": "16 - I’m desperate to get out ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 17,
        "title": "J’voulais te dire ( feat.Breli-k )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/17%20-%20J%E2%80%99voulais%20te%20dire%20%28%20feat.Breli-k%20%29.mp3",
        "filename": "17 - J’voulais te dire ( feat.Breli-k ).mp3",
        "archiveFilename": "17 - J’voulais te dire ( feat.Breli-k ).mp3",
        "genius": null
      },
      {
        "number": 18,
        "title": "J’met les voiles ( feat.L’Algerino )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/18%20-%20J%E2%80%99met%20les%20voiles%20%28%20feat.L%E2%80%99Algerino%20%29.mp3",
        "filename": "18 - J’met les voiles ( feat.L’Algerino ).mp3",
        "archiveFilename": "18 - J’met les voiles ( feat.L’Algerino ).mp3",
        "genius": null
      },
      {
        "number": 19,
        "title": "Loin ( feat.Houari & Kalif hardcore )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/19%20-%20Loin%20%28%20feat.Houari%20%26%20Kalif%20hardcore%20%29.mp3",
        "filename": "19 - Loin ( feat.Houari & Kalif hardcore ).mp3",
        "archiveFilename": "19 - Loin ( feat.Houari & Kalif hardcore ).mp3",
        "genius": null
      },
      {
        "number": 20,
        "title": "Pour le 1.3.5 Saint-Jean",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/20%20-%20Pour%20le%201.3.5%20Saint-Jean.mp3",
        "filename": "20 - Pour le 1.3.5 Saint-Jean.mp3",
        "archiveFilename": "20 - Pour le 1.3.5 Saint-Jean.mp3",
        "genius": null
      },
      {
        "number": 21,
        "title": "Winanao",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/21%20-%20Winanao.mp3",
        "filename": "21 - Winanao.mp3",
        "archiveFilename": "21 - Winanao.mp3",
        "genius": null
      },
      {
        "number": 22,
        "title": "On y est ( feat.Houari )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/22%20-%20On%20y%20est%20%28%20feat.Houari%20%29.mp3",
        "filename": "22 - On y est ( feat.Houari ).mp3",
        "archiveFilename": "22 - On y est ( feat.Houari ).mp3",
        "genius": null
      },
      {
        "number": 23,
        "title": "Côté passager ( feat.Zakmess )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/23%20-%20C%C3%B4t%C3%A9%20passager%20%28%20feat.Zakmess%20%29.mp3",
        "filename": "23 - Côté passager ( feat.Zakmess ).mp3",
        "archiveFilename": "23 - Côté passager ( feat.Zakmess ).mp3",
        "genius": null
      },
      {
        "number": 24,
        "title": "Y a d’quoi devenir fous ( feat.Kalif hardcore & Houari )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/24%20-%20Y%20a%20d%E2%80%99quoi%20devenir%20fous%20%28%20feat.Kalif%20hardcore%20%26%20Houari%20%29.mp3",
        "filename": "24 - Y a d’quoi devenir fous ( feat.Kalif hardcore & Houari ).mp3",
        "archiveFilename": "24 - Y a d’quoi devenir fous ( feat.Kalif hardcore & Houari ).mp3",
        "genius": null
      },
      {
        "number": 25,
        "title": "On fait c’qu’on peut ( feat.Nino )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/25%20-%20On%20fait%20c%E2%80%99qu%E2%80%99on%20peut%20%28%20feat.Nino%20%29.mp3",
        "filename": "25 - On fait c’qu’on peut ( feat.Nino ).mp3",
        "archiveFilename": "25 - On fait c’qu’on peut ( feat.Nino ).mp3",
        "genius": null
      },
      {
        "number": 26,
        "title": "Ils l’ont cherché",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/26%20-%20Ils%20l%E2%80%99ont%20cherch%C3%A9.mp3",
        "filename": "26 - Ils l’ont cherché.mp3",
        "archiveFilename": "26 - Ils l’ont cherché.mp3",
        "genius": null
      },
      {
        "number": 27,
        "title": "Mise à l’amende ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/27%20-%20Mise%20%C3%A0%20l%E2%80%99amende%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "27 - Mise à l’amende ( feat.non crédité ).mp3",
        "archiveFilename": "27 - Mise à l’amende ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 28,
        "title": "Sale vie",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/28%20-%20Sale%20vie.mp3",
        "filename": "28 - Sale vie.mp3",
        "archiveFilename": "28 - Sale vie.mp3",
        "genius": null
      },
      {
        "number": 29,
        "title": "Sans déconner",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/29%20-%20Sans%20d%C3%A9conner.mp3",
        "filename": "29 - Sans déconner.mp3",
        "archiveFilename": "29 - Sans déconner.mp3",
        "genius": null
      },
      {
        "number": 30,
        "title": "Thug",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/30%20-%20Thug.mp3",
        "filename": "30 - Thug.mp3",
        "archiveFilename": "30 - Thug.mp3",
        "genius": null
      },
      {
        "number": 31,
        "title": "Vis ma vie",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/31%20-%20Vis%20ma%20vie.mp3",
        "filename": "31 - Vis ma vie.mp3",
        "archiveFilename": "31 - Vis ma vie.mp3",
        "genius": null
      },
      {
        "number": 32,
        "title": "La Puenta sur la bannière ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/32%20-%20La%20Puenta%20sur%20la%20banni%C3%A8re%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "32 - La Puenta sur la bannière ( feat.non crédité ).mp3",
        "archiveFilename": "32 - La Puenta sur la bannière ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 33,
        "title": "Parle trop ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/33%20-%20Parle%20trop%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "33 - Parle trop ( feat.non crédité ).mp3",
        "archiveFilename": "33 - Parle trop ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 34,
        "title": "Poto où t’es 1",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/34%20-%20Poto%20o%C3%B9%20t%E2%80%99es%201.mp3",
        "filename": "34 - Poto où t’es 1.mp3",
        "archiveFilename": "34 - Poto où t’es 1.mp3",
        "genius": null
      },
      {
        "number": 35,
        "title": "Pour les princesses",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/35%20-%20Pour%20les%20princesses.mp3",
        "filename": "35 - Pour les princesses.mp3",
        "archiveFilename": "35 - Pour les princesses.mp3",
        "genius": null
      },
      {
        "number": 36,
        "title": "Quand il y a les lovés",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/36%20-%20Quand%20il%20y%20a%20les%20lov%C3%A9s.mp3",
        "filename": "36 - Quand il y a les lovés.mp3",
        "archiveFilename": "36 - Quand il y a les lovés.mp3",
        "genius": null
      },
      {
        "number": 37,
        "title": "Rap d’artistes 1.3.5 ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/37%20-%20Rap%20d%E2%80%99artistes%201.3.5%20%28%20feat.non%20cr%C3%A9dit%C3%A9%20%29.mp3",
        "filename": "37 - Rap d’artistes 1.3.5 ( feat.non crédité ).mp3",
        "archiveFilename": "37 - Rap d’artistes 1.3.5 ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 38,
        "title": "Y a que des salopes",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/38%20-%20Y%20a%20que%20des%20salopes.mp3",
        "filename": "38 - Y a que des salopes.mp3",
        "archiveFilename": "38 - Y a que des salopes.mp3",
        "genius": null
      },
      {
        "number": 39,
        "title": "Histoire de frères ( feat.Wanted & Ilyes )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/39%20-%20Histoire%20de%20fr%C3%A8res%20%28%20feat.Wanted%20%26%20Ilyes%20%29.mp3",
        "filename": "39 - Histoire de frères ( feat.Wanted & Ilyes ).mp3",
        "archiveFilename": "39 - Histoire de frères ( feat.Wanted & Ilyes ).mp3",
        "genius": null
      },
      {
        "number": 40,
        "title": "Lacrizeotiek.com",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/40%20-%20Lacrizeotiek.com.mp3",
        "filename": "40 - Lacrizeotiek.com.mp3",
        "archiveFilename": "40 - Lacrizeotiek.com.mp3",
        "genius": null
      },
      {
        "number": 41,
        "title": "C’est pas la peine",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/41%20-%20C%E2%80%99est%20pas%20la%20peine.mp3",
        "filename": "41 - C’est pas la peine.mp3",
        "archiveFilename": "41 - C’est pas la peine.mp3",
        "genius": null
      },
      {
        "number": 42,
        "title": "Akha",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/42%20-%20Akha.mp3",
        "filename": "42 - Akha.mp3",
        "archiveFilename": "42 - Akha.mp3",
        "genius": null
      },
      {
        "number": 43,
        "title": "Fais-moi voir ( feat.Mister You )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/43%20-%20Fais-moi%20voir%20%28%20feat.Mister%20You%20%29.mp3",
        "filename": "43 - Fais-moi voir ( feat.Mister You ).mp3",
        "archiveFilename": "43 - Fais-moi voir ( feat.Mister You ).mp3",
        "genius": null
      },
      {
        "number": 45,
        "title": "I love you",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/45%20-%20I%20love%20you.mp3",
        "filename": "45 - I love you.mp3",
        "archiveFilename": "45 - I love you.mp3",
        "genius": null
      },
      {
        "number": 46,
        "title": "Moi c’est lacrizeomic",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/46%20-%20Moi%20c%E2%80%99est%20lacrizeomic.mp3",
        "filename": "46 - Moi c’est lacrizeomic.mp3",
        "archiveFilename": "46 - Moi c’est lacrizeomic.mp3",
        "genius": null
      },
      {
        "number": 47,
        "title": "Chu killer",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/47%20-%20Chu%20killer.mp3",
        "filename": "47 - Chu killer.mp3",
        "archiveFilename": "47 - Chu killer.mp3",
        "genius": null
      },
      {
        "number": 48,
        "title": "On laisse rien ( feat.Wanted & Como )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/48%20-%20On%20laisse%20rien%20%28%20feat.Wanted%20%26%20Como%20%29.mp3",
        "filename": "48 - On laisse rien ( feat.Wanted & Como ).mp3",
        "archiveFilename": "48 - On laisse rien ( feat.Wanted & Como ).mp3",
        "genius": null
      },
      {
        "number": 49,
        "title": "Dans ma paranoïa - version instrumentale ( bonus track )",
        "artist": "JuL",
        "src": "https://archive.org/download/avantLusineVol2/49%20-%20Dans%20ma%20parano%C3%AFa%20-%20version%20instrumentale%20%28%20bonus%20track%20%29.mp3",
        "filename": "49 - Dans ma paranoïa - version instrumentale ( bonus track ).mp3",
        "archiveFilename": "49 - Dans ma paranoïa - version instrumentale ( bonus track ).mp3",
        "genius": null
      }
    ],
    "motion": "./pochette-animee-02.mp4"
  },
  {
    "number": 3,
    "title": "Volume 03",
    "cover": "./cover-03.webp",
    "zip": "https://mega.nz/file/BN91VbKY#ToqdoDNIH9VaGV-yEQ60n_3EG4Jy8MrQb9IBy6G0mlk",
    "tracks": [
      {
        "number": 1,
        "title": "Miné",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/01%20-%20Mine%CC%81.mp3",
        "filename": "01 - Miné.mp3",
        "archiveFilename": "01 - Miné.mp3",
        "genius": null
      },
      {
        "number": 2,
        "title": "Révolution",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/02%20-%20Re%CC%81volution.mp3",
        "filename": "2 - Révolution.mp3",
        "archiveFilename": "02 - Révolution.mp3",
        "genius": null
      },
      {
        "number": 3,
        "title": "Malamadré",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/03%20-%20Malamadre%CC%81.mp3",
        "filename": "3 - Malamadré.mp3",
        "archiveFilename": "03 - Malamadré.mp3",
        "genius": null
      },
      {
        "number": 4,
        "title": "Mal aimé",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/04%20-%20Mal%20aime%CC%81.mp3",
        "filename": "4 - Mal aimé.mp3",
        "archiveFilename": "04 - Mal aimé.mp3",
        "genius": null
      },
      {
        "number": 5,
        "title": "On n’a pas le choix ( feat.Veazy )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/05%20-%20On%20n%E2%80%99a%20pas%20le%20choix%20%28%20feat.Veazy%20%29.mp3",
        "filename": "5 - On n’a pas le choix ( feat.Veazy ).mp3",
        "archiveFilename": "05 - On n’a pas le choix ( feat.Veazy ).mp3",
        "genius": null
      },
      {
        "number": 6,
        "title": "wesh le clin’s ( feat.Soso maness )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/06%20-%20wesh%20le%20clin%E2%80%99s%20%28%20feat.Soso%20maness%20%29.mp3",
        "filename": "6 - wesh le clin’s ( feat.Soso maness ).mp3",
        "archiveFilename": "06 - wesh le clin’s ( feat.Soso maness ).mp3",
        "genius": null
      },
      {
        "number": 7,
        "title": "Ça m’a mis dedans ( feat.Nino )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/07%20-%20C%CC%A7a%20m%E2%80%99a%20mis%20dedans%20%28%20feat.Nino%20%29.mp3",
        "filename": "7 - Ça m’a mis dedans ( feat.Nino ).mp3",
        "archiveFilename": "07 - Ça m’a mis dedans ( feat.Nino ).mp3",
        "genius": null
      },
      {
        "number": 8,
        "title": "Qu’est-c’qu’tu connais de ma vie",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/08%20-%20Qu%E2%80%99est-c%E2%80%99qu%E2%80%99tu%20connais%20de%20ma%20vie.mp3",
        "filename": "8 - Qu’est-c’qu’tu connais de ma vie.mp3",
        "archiveFilename": "08 - Qu’est-c’qu’tu connais de ma vie.mp3",
        "genius": null
      },
      {
        "number": 9,
        "title": "J’trace",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/09%20-%20J%E2%80%99trace.mp3",
        "filename": "9 - J’trace.mp3",
        "archiveFilename": "09 - J’trace.mp3",
        "genius": null
      },
      {
        "number": 10,
        "title": "Je m’isole",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/10%20-%20Je%20m%E2%80%99isole.mp3",
        "filename": "10 - Je m’isole.mp3",
        "archiveFilename": "10 - Je m’isole.mp3",
        "genius": null
      },
      {
        "number": 11,
        "title": "Alors les frères ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/11%20-%20Alors%20les%20fre%CC%80res%20%28%20feat.non%20cre%CC%81dite%CC%81%20%29.mp3",
        "filename": "11 - Alors les frères ( feat.non crédité ).mp3",
        "archiveFilename": "11 - Alors les frères ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 12,
        "title": "D’où je vient",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/12%20-%20D%E2%80%99ou%CC%80%20je%20vient.mp3",
        "filename": "12 - D’où je vient.mp3",
        "archiveFilename": "12 - D’où je vient.mp3",
        "genius": null
      },
      {
        "number": 13,
        "title": "Un son de tess",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/13%20-%20Un%20son%20de%20tess.mp3",
        "filename": "13 - Un son de tess.mp3",
        "archiveFilename": "13 - Un son de tess.mp3",
        "genius": null
      },
      {
        "number": 14,
        "title": "Y’a plus d’amour ( feat.Tanyno )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/14%20-%20Y%E2%80%99a%20plus%20d%E2%80%99amour%20%28%20feat.Tanyno%20%29.mp3",
        "filename": "14 - Y’a plus d’amour ( feat.Tanyno ).mp3",
        "archiveFilename": "14 - Y’a plus d’amour ( feat.Tanyno ).mp3",
        "genius": null
      },
      {
        "number": 15,
        "title": "Au piquet",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/15%20-%20Au%20piquet.mp3",
        "filename": "15 - Au piquet.mp3",
        "archiveFilename": "15 - Au piquet.mp3",
        "genius": null
      },
      {
        "number": 16,
        "title": "Bonita",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/16%20-%20Bonita.mp3",
        "filename": "16 - Bonita.mp3",
        "archiveFilename": "16 - Bonita.mp3",
        "genius": null
      },
      {
        "number": 17,
        "title": "Moi ci, moi ça",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/17%20-%20Moi%20ci%2C%20moi%20c%CC%A7a.mp3",
        "filename": "17 - Moi ci, moi ça.mp3",
        "archiveFilename": "17 - Moi ci, moi ça.mp3",
        "genius": null
      },
      {
        "number": 18,
        "title": "All Eyez on Me",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/18%20-%20All%20Eyez%20on%20Me.mp3",
        "filename": "18 - All Eyez on Me.mp3",
        "archiveFilename": "18 - All Eyez on Me.mp3",
        "genius": null
      },
      {
        "number": 19,
        "title": "Le jour et la nuit ( feat.Houari )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/19%20-%20Le%20jour%20et%20la%20nuit%20%28%20feat.Houari%20%29.mp3",
        "filename": "19 - Le jour et la nuit ( feat.Houari ).mp3",
        "archiveFilename": "19 - Le jour et la nuit ( feat.Houari ).mp3",
        "genius": null
      },
      {
        "number": 20,
        "title": "Liga One Industry",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/20%20-%20Liga%20One%20Industry.mp3",
        "filename": "20 - Liga One Industry.mp3",
        "archiveFilename": "20 - Liga One Industry.mp3",
        "genius": null
      },
      {
        "number": 21,
        "title": "Elle",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/21%20-%20Elle.mp3",
        "filename": "21 - Elle.mp3",
        "archiveFilename": "21 - Elle.mp3",
        "genius": null
      },
      {
        "number": 22,
        "title": "Le vice du ghetto ( feat.Nono )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/22%20-%20Le%20vice%20du%20ghetto%20%28%20feat.Nono%20%29.mp3",
        "filename": "22 - Le vice du ghetto ( feat.Nono ).mp3",
        "archiveFilename": "22 - Le vice du ghetto ( feat.Nono ).mp3",
        "genius": null
      },
      {
        "number": 23,
        "title": "J’gamberge",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/23%20-%20J%E2%80%99gamberge.mp3",
        "filename": "23 - J’gamberge.mp3",
        "archiveFilename": "23 - J’gamberge.mp3",
        "genius": null
      },
      {
        "number": 24,
        "title": "T’étonne pas ( feat.Bil-K )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/24%20-%20T%E2%80%99e%CC%81tonne%20pas%20%28%20feat.Bil-K%20%29.mp3",
        "filename": "24 - T’étonne pas ( feat.Bil-K ).mp3",
        "archiveFilename": "24 - T’étonne pas ( feat.Bil-K ).mp3",
        "genius": null
      },
      {
        "number": 25,
        "title": "L’hiver au quartier ( feat.Mehdi YZ, Hors Ligne, Ger, Norey & Moubarak )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/25%20-%20L%E2%80%99hiver%20au%20quartier%20%28%20feat.Mehdi%20YZ%2C%20Hors%20Ligne%2C%20Ger%2C%20Norey%20%26%20Moubarak%20%29.mp3",
        "filename": "25 - L’hiver au quartier ( feat.Mehdi YZ, Hors Ligne, Ger, Norey & Moubarak ).mp3",
        "archiveFilename": "25 - L’hiver au quartier ( feat.Mehdi YZ, Hors Ligne, Ger, Norey & Moubarak ).mp3",
        "genius": null
      },
      {
        "number": 26,
        "title": "Range ta kalash",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/26%20-%20Range%20ta%20kalash.mp3",
        "filename": "26 - Range ta kalash.mp3",
        "archiveFilename": "26 - Range ta kalash.mp3",
        "genius": null
      },
      {
        "number": 27,
        "title": "Laisse-moi respirer ( feat.Norey Fz )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/27%20-%20Laisse-moi%20respirer%20%28%20feat.Norey%20Fz%20%29.mp3",
        "filename": "27 - Laisse-moi respirer ( feat.Norey Fz ).mp3",
        "archiveFilename": "27 - Laisse-moi respirer ( feat.Norey Fz ).mp3",
        "genius": null
      },
      {
        "number": 28,
        "title": "Tu m’as pas dit",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/28%20-%20Tu%20m%E2%80%99as%20pas%20dit.mp3",
        "filename": "28 - Tu m’as pas dit.mp3",
        "archiveFilename": "28 - Tu m’as pas dit.mp3",
        "genius": null
      },
      {
        "number": 29,
        "title": "Chacun sa life ( feat.non crédité )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/29%20-%20Chacun%20sa%20life%20%28%20feat.non%20cre%CC%81dite%CC%81%20%29.mp3",
        "filename": "29 - Chacun sa life ( feat.non crédité ).mp3",
        "archiveFilename": "29 - Chacun sa life ( feat.non crédité ).mp3",
        "genius": null
      },
      {
        "number": 30,
        "title": "Au bord de la mer",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/30%20-%20Au%20bord%20de%20la%20mer.mp3",
        "filename": "30 - Au bord de la mer.mp3",
        "archiveFilename": "30 - Au bord de la mer.mp3",
        "genius": null
      },
      {
        "number": 31,
        "title": "On change pas nos habitudes ( feat.Wanted & Gambino )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/31%20-%20On%20change%20pas%20nos%20habitudes%20%28%20feat.Wanted%20%26%20Gambino%20%29.mp3",
        "filename": "31 - On change pas nos habitudes ( feat.Wanted & Gambino ).mp3",
        "archiveFilename": "31 - On change pas nos habitudes ( feat.Wanted & Gambino ).mp3",
        "genius": null
      },
      {
        "number": 32,
        "title": "For me",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/32%20-%20For%20me.mp3",
        "filename": "32 - For me.mp3",
        "archiveFilename": "32 - For me.mp3",
        "genius": null
      },
      {
        "number": 33,
        "title": "Soleil ( feat.Kalif Hardcore & Soso Maness )",
        "artist": "JuL",
        "src": "https://archive.org/download/AvantUsineVol3/33%20-%20Soleil%20%28%20feat.Kalif%20Hardcore%20%26%20Soso%20Maness%20%29.mp3",
        "filename": "33 - Soleil ( feat.Kalif Hardcore & Soso Maness ).mp3",
        "archiveFilename": "33 - Soleil ( feat.Kalif Hardcore & Soso Maness ).mp3",
        "genius": null
      }
    ],
    "motion": "./pochette-animee-03.mp4"
  },
  {
    "number": 4,
    "title": "Volume 04",
    "cover": "./cover-04.webp",
    "zip": "",
    "tracks": [],
    "motion": "./pochette-animee-04.mp4"
  },
  {
    "number": 5,
    "title": "Volume 05",
    "cover": "./cover-05.webp",
    "zip": "",
    "tracks": [],
    "motion": "./pochette-animee-05.mp4"
  },
  {
    "number": 6,
    "title": "Volume 06",
    "cover": "./cover-06.webp",
    "zip": "",
    "tracks": [],
    "motion": "./pochette-animee-06.mp4"
  },
  {
    "number": 7,
    "title": "Volume 07",
    "cover": "./cover-07.webp",
    "zip": "",
    "tracks": [],
    "motion": "./pochette-animee-07.mp4"
  },
  {
    "number": 8,
    "title": "Volume 08",
    "cover": "./cover-08.webp",
    "zip": "",
    "tracks": [],
    "motion": "./pochette-animee-08.mp4"
  }
];
