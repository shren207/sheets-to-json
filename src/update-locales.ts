import { GoogleSpreadsheet } from 'google-spreadsheet';
import logger from '../utils/logger';
import std from '../utils/std';
import credential from './credential.json';

/*
  스프레드 시트 주소는 다음과 같은 형태이며, 그 중 1️⃣SPREAD_SHEET_DOC_ID, 2️⃣SHEET_ID 부분의 값을 복사해서 사용한다.
  https://docs.google.com/spreadsheets/d/1️⃣SPREAD_SHEET_DOC_ID/edit#gid=2️⃣SHEET_ID
*/
const SPREAD_SHEET_DOC_ID = '1RENVK6LUrv-ajWrb6zf0iaEFiyQk9kB3PSQb_zCtBuk';
const SHEET_ID = 0;
const NOT_AVAILABLE_CELL = '_N/A';
const TARGET_DIR_PATH = './assets/translations'; // json 파일이 저장될 위치

const GOOGLE_SHEET_LANGUAGE_INDEXES: { [key: string]: number } = {
  ko: 4,
  en: 5,
};

type LanguageTypes = 'ko' | 'en';

const languages: LanguageTypes[] = ['ko', 'en'];

async function checkAndMakeLocaleDir(dirPath: string, subDirs?: string[]) {
  if (subDirs) {
    subDirs.forEach((subDir) => {
      try {
        std.fs.mkdir(`${dirPath}/${subDir}`, { recursive: true });
      } catch (e) {
        logger.error(`❌  Failed to create directory: ${dirPath}/${subDir}`);
        logger.error(e);
      }
    });
  } else {
    try {
      await std.fs.mkdir(dirPath, { recursive: true });
    } catch (e) {
      logger.error(`❌  Failed to create directory: ${dirPath}`);
      logger.error(e);
    }
  }
}

async function getGoogleSheetData() {
  const doc = new GoogleSpreadsheet(SPREAD_SHEET_DOC_ID);

  await doc.useServiceAccountAuth(credential);
  await doc.loadInfo(); // loads document properties and worksheets

  return doc;
}

async function mapGoogleSheetData(doc: GoogleSpreadsheet) {
  const sheet = doc.sheetsById[SHEET_ID];

  if (!sheet) {
    return {};
  }

  const result: { [key: string]: { [key: string]: string } } = {};
  const rows = await sheet.getRows();

  const newRows = rows.slice(2); // 필요없는 행 제거

  newRows.forEach((row) => {
    const key = row._rawData[3];

    languages.forEach((language) => {
      const translation = row._rawData[GOOGLE_SHEET_LANGUAGE_INDEXES[language]];
      if (translation === NOT_AVAILABLE_CELL) {
        return;
      }

      if (!result[language]) {
        result[language] = {};
      }

      result[language][key] = translation || NOT_AVAILABLE_CELL;
    });
  });

  return result;
}

async function saveGoogleSheetDataToFile(
  language: 'ko' | 'en',
  googleSheetData: { [key: string]: string }
) {
  const localeJsonFilePath = std.path.join(TARGET_DIR_PATH, `${language}.json`);

  await std.fs.writeFile(
    localeJsonFilePath,
    JSON.stringify(googleSheetData, null, 2)
  );
  logger.info(`✅  Successfully updated ${localeJsonFilePath}`);
}

async function bootstrap() {
  logger.info('🔎 Checking and making locale directories...');
  await checkAndMakeLocaleDir(TARGET_DIR_PATH);

  logger.info('🔎 Getting Google Sheet data...');
  const googleSheetData = await getGoogleSheetData();

  logger.info('🔎 Mapping Google Sheet data...');
  const mappedGoogleSheetData = await mapGoogleSheetData(googleSheetData);

  try {
    logger.info('🔎 Updating locales...');
    await Promise.all(
      languages.map(async (language) => {
        await saveGoogleSheetDataToFile(
          language,
          mappedGoogleSheetData[language]
        );
      })
    );
  } catch (e) {
    logger.error('❌  Failed to update locales.');
    logger.error(e);
  }
}

bootstrap().then(() => {
  // @ts-ignore
  process.exit(0);
});
