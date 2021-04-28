const express = require("express");
const request = require("request");
const path = require("path");
const stories = require("./stories");

//return the express application
const app = express();

//Express Middleware
app.use((req, res, next) => {
  console.log("request details", req.method, "original url", req.originalUrl);
  next();
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.static(path.join(__dirname, "client/dist")));

app.get("/ping", (req, res) => {
  res.send("pong 2");
});

app.get("/stories", (req, res) => {
  const { limit, offset } = req.query; // Pagination can have next and Previous which can cache the previous and next url with the correct limit and offset
  if (!limit && !offset) {
    res.json(stories); //respond in a json format in the APIs
  } else {
    res.json(stories.filter((s) => s.id >= offset && s.id <= offset + limit));
  }
});

app.get("/stories/:title", (req, res) => {
  const { title } = req.params;

  res.json(stories.filter((s) => s.title.includes(title))); //respond in a json format in the APIs
});

app.get("/topstories", (req, res, next) => {
  request(
    { url: "https://hacker-news.firebaseio.com/v0/topstories.json" },
    (error, response, body) => {
      if (error || response.statusCode != 200) {
        console.log("Going to next Middleware");
        return next(new Error("Error requesting top stories"));
      }
      const limit = 10;
      const topStories = JSON.parse(body).slice(0, limit);

      Promise.all(
        topStories.map((story) => {
          return new Promise((resolve, reject) => {
            request(
              {
                url: `https://hacker-news.firebaseio.com/v0/item/${story}.json`,
              },
              (error, response, body) => {
                if (error || response.statusCode != 200) {
                  console.log("Going to next Middleware");
                  return next(new Error("Error requesting Story Item"));
                }
                resolve(JSON.parse(body));
              }
            );
          });
        })
      )
        .then((fullTopStories) => {
          res.json(fullTopStories);
        })
        .catch((error) => next(error));
    }
  );
});

app.use((err, req, res, next) => {
  console.log("error", err);
  //res.send("An Error has occurred");
  res.status(500).json({ type: "error", message: err.message });
});
const PORT = 3000;
app.listen(PORT, () => console.log(`listening to ${PORT}`));
