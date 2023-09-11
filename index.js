const contentful = require("contentful-management");
const dotenv = require("dotenv");
const data = require("./data/data.json");
const colors = require("colors");

dotenv.config();

const Env = process.env.ENVIRONMENT;
const SpaceId = process.env.SPACE_ID;
const AccessToken = process.env.ACCESS_TOKEN;

const client = contentful.createClient({
  accessToken: AccessToken,
});

// Get the existing data from Contentful
const getExistingItems = async () => {
  try {
    const items = await client
      .getSpace(SpaceId)
      .then((space) => space.getEnvironment(Env))
      .then((environment) => environment.getEntries({ content_type: "test" }))
      .then((entries) => entries.items)
      .then((entry) =>
        entry.map((item) => ({
          id: item.sys.id,
          createdAt: item.sys.createdAt,
          updatedAt: item.sys.updatedAt,
          testId: item.fields.testId["en-US"],
          testName: item.fields.testName["en-US"],
        }))
      );
    return items;
  } catch (error) {
    console.error(`Error getting existing items:, ${error}`.red);
    throw error;
  }
};

// Read the data from the JSON file
const jsonItems = data.items;

const retrieveAndCompareItems = async () => {
  try {
    const items = await getExistingItems();
    for (const { testId, testName } of jsonItems) {
      const existingItem = items.find((item) => item.testId === testId);
      if (existingItem) {
        const entryId = existingItem.id;
        if (existingItem.testName !== testName) {
          console.log(
            `Updating:`.bgYellow +
              ` Test ID: ${testId}, Test Name: ${existingItem.testName}`.yellow
                .yellow
          );
          await updateContentfulEntry(
            entryId,
            { testId, testName },
            existingItem.testName
          );
        }
      } else {
        console.log(
          `Adding:`.bgYellow +
            ` Test ID: ${testId}, Test Name: ${testName}`.green
        );
        await createContentfulEntry({ testId, testName });
      }
    }
  } catch (error) {
    console.error(`Error:, ${error}`.bgRed);
    throw error;
  }
};

const updateContentfulEntry = async (entryId, fields, oldtestName) => {
  const { testId, testName } = fields;
  const oldTestName = oldtestName;
  try {
    await client
      .getSpace(SpaceId)
      .then((space) => space.getEnvironment(Env))
      .then((environment) => environment.getEntry(entryId))
      .then((entry) => {
        entry.fields.testName["en-US"] = testName;
        return entry.update();
      })
      .then((entry) => {
        console.log(
          `Updated: testId: ${testId} from testName: ${oldTestName} to testName: ${testName} `
            .bgGreen
        );
        entry.publish();
        console.log(
          `Published: testId: ${testId}, testName: ${testName} `.bgGreen
        );
      });
  } catch (error) {
    console.error(`Error:, ${error}`.red);
    throw error;
  }
};

const createContentfulEntry = async (fields) => {
  const { testId, testName } = fields;
  try {
    await client
      .getSpace(SpaceId)
      .then((space) => space.getEnvironment(Env))
      .then((environment) =>
        environment.createEntry("test", {
          fields: {
            testId: {
              "en-US": testId,
            },
            testName: {
              "en-US": testName,
            },
          },
        })
      )
      .then((entry) => {
        console.log(
          `Created: Test ID: ${testId} Test Name: ${testName} \n with Entry ID: ${entry.sys.id}`
            .bgGreen
        );
        entry.publish();
        console.log(
          `Published: Test ID: ${testId} Test Name: ${testName} \n with Entry ID: ${entry.sys.id}`
            .bgGreen
        );
      });
  } catch (error) {
    console.error(`Error:, ${error}`.red);
    throw error;
  }
};

retrieveAndCompareItems();
