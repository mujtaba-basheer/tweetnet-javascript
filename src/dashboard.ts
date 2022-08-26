let development = false;

var Swiper: any =
  ((window as unknown as Window & { Swiper: any }).Swiper as any) || {};
var MemberStack: IMemberStack =
  (window.MemberStack as IMemberStack) || ({} as IMemberStack);

interface IApiCall {
  tokenObj: TokenObj;
  baseUrl: string;

  getReq<T>(path: string): Promise<T>;
  postReq<T>(path: string, body: object): Promise<T>;
  refreshToken(): Promise<null>;
}
type RespProto = {
  status: boolean;
  message?: string;
  data?: any;
};
type TweetObj = {
  author_id: string;
  id: string;
  created_at: {
    date: string;
    time: string;
  };
  text: string;
  attachement_urls: string[];
};
type GetTweetsResp = {
  tweets: TodoTweetObj[];
  limit_exceeded: boolean;
};
type TodoTweetObj = {
  author_id: string;
  id: string;
  created_at: {
    date: string;
    time: string;
  };
  text: string;
  attachement_urls: string[];
  author_details: {
    username: string;
    name: string;
    profile_image_url: string;
  };
};
type ActionResponse = {
  message: string;
  limit_exceeded: boolean;
};
type Shuffle = {
  (len: number): number[];
};

class ApiCall implements IApiCall {
  public tokenObj: TokenObj;
  public baseUrl: string;

  constructor() {
    const tokenObj: TokenObj | null = JSON.parse(
      localStorage.getItem("token") || "null"
    );
    if (tokenObj) {
      this.tokenObj = tokenObj;
      this.baseUrl = development
        ? "http://127.0.0.1:5000/apiV1"
        : "https://api.tweetnest.io/apiV1";

      MemberStack.onReady.then((member) => {
        if (!member.loggedIn) window.location.pathname = "/";
      });
    } else window.location.pathname = "/";
  }

  getReq<T>(path: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const req = await fetch(this.baseUrl + path, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.tokenObj.access_token}`,
          },
        });
        const resp: RespProto = await req.json();

        if (resp.status) return resolve(resp.data as T);
        // else if (req.status === 403) {
        //   try {
        //     await this.refreshToken();
        //     return resolve(await this.getReq(path));
        //   } catch (error) {
        //     console.error(error);
        //     window.location.pathname = "/";
        //   }
        // }
        throw new Error(resp.message);
      } catch (error) {
        reject(error);
      }
    });
  }

  postReq<T>(path: string, body: object): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const req = await fetch(this.baseUrl + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.tokenObj.access_token}`,
          },
          body: JSON.stringify(body),
        });
        const resp: RespProto = await req.json();

        if (resp.status) return resolve(resp.data as T);
        // else if (req.status === 403) {
        //   try {
        //     await this.refreshToken();
        //     return resolve(await this.postReq(path, body));
        //   } catch (error) {
        //     window.location.pathname = "/";
        //   }
        // }
        throw new Error(resp.message);
      } catch (error) {
        reject(error);
      }
    });
  }

  refreshToken(): Promise<null> {
    console.log("refreshToken");
    return new Promise(async (resolve, reject) => {
      try {
        const req = await fetch(this.baseUrl + "/auth/refresh-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.tokenObj.access_token}`,
          },
          body: JSON.stringify({
            token: {
              refresh_token: this.tokenObj.refresh_token,
            },
          }),
        });
        const resp: RespProto = await req.json();

        if (resp.status) {
          localStorage.setItem("token", JSON.stringify(resp.data));
          this.tokenObj = resp.data;
          return resolve(null);
        }
        throw new Error(resp.message);
      } catch (error) {
        reject(error);
      }
    });
  }
}

const shuffle: Shuffle = (len: number) => {
  const array = new Array(len);
  for (let i = 0; i < len; i++) array[i] = i;

  let currentIndex = len,
    randomIndex: number;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};

const handleResponse = (task: string, limit_exceeded: boolean) => {
  if (!limit_exceeded) return;

  try {
    const completeEl = document.getElementById(`${task}-complete`);
    completeEl.style.display = "block";

    const swiperEl = document.getElementById(`${task}-overall`);
    swiperEl.style.display = "none";
  } catch (error) {
    console.error(error);
  }
};

window.addEventListener("load", async () => {
  try {
    const apiCall = new ApiCall();

    // LOGOUT
    {
      const el = document.getElementById("logout-id");
      const logoutBtn = document.createElement("a");
      logoutBtn.classList.add("button-small");
      logoutBtn.classList.add("w-button");
      logoutBtn.href = "#";
      logoutBtn.textContent = "Logout";
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        MemberStack.logout();
      });
      el.after(logoutBtn);
      el.remove();
    }

    // MY TWEETS
    {
      // fetching tweets
      type MyTweetsRespData = {
        author_details: {
          name: string;
          username: string;
          profile_image_url: string;
        };
        tweets: TweetObj[];
        limit_exceeded: boolean;
      };
      const { author_details, tweets, limit_exceeded } =
        await apiCall.getReq<MyTweetsRespData>("/user/my-tweets");

      if (limit_exceeded) handleResponse("your", true);

      const containerEl = document.getElementById("your-tweets-swiper");

      for (let i = 0; i < tweets.length; i++) {
        const tweet: TweetObj = tweets[i];

        const { id: tid, text, created_at } = tweet;

        // creating tweet element
        const rootEl = document.createElement("div");
        rootEl.classList.add("swiper-slide");
        rootEl.classList.add("bigger-swiper-slide");
        {
          const formDiv = document.createElement("div");
          formDiv.classList.add("form-block-twitter");
          formDiv.classList.add("w-form");
          {
            const formEl = document.createElement("form");
            formEl.classList.add("form-twitter");
            formEl.classList.add("flex-vertical");
            {
              const boxDiv = document.createElement("div");
              boxDiv.classList.add("form-card");
              {
                const authorDiv = document.createElement("div");
                authorDiv.classList.add("twitter-author");
                {
                  const profileImg = document.createElement("img");
                  profileImg.classList.add("twitter-author-image");
                  profileImg.loading = "lazy";
                  profileImg.src = author_details.profile_image_url;
                  profileImg.alt = "";

                  const colDiv = document.createElement("div");
                  colDiv.classList.add("column");
                  colDiv.style.width = "100%";
                  {
                    const nameEl = document.createElement("div");
                    nameEl.classList.add("name-text");
                    nameEl.textContent = author_details.name;

                    const handleEl = document.createElement("div");
                    handleEl.classList.add("handle-text");
                    handleEl.textContent = `@${author_details.username}`;

                    colDiv.appendChild(nameEl);
                    colDiv.appendChild(handleEl);
                  }

                  const iconDiv = document.createElement("img");
                  iconDiv.classList.add("twitter-icon-image");
                  iconDiv.sizes = "20px";
                  iconDiv.loading = "lazy";
                  iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                  iconDiv.src =
                    "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                  authorDiv.appendChild(profileImg);
                  authorDiv.appendChild(colDiv);
                  authorDiv.appendChild(iconDiv);
                }

                const postDiv = document.createElement("div");
                postDiv.classList.add("overflow-block");
                {
                  const postEl = document.createElement("p");
                  postEl.classList.add("post-text");
                  postEl.innerHTML = text;

                  const oneImgDiv = document.createElement("div");
                  oneImgDiv.classList.add("one-scenario-image");
                  oneImgDiv.classList.add("hide");
                  {
                    const imgEl = document.createElement("img");
                    imgEl.classList.add("cover-image");
                    imgEl.loading = "lazy";
                    imgEl.alt = "";

                    oneImgDiv.appendChild(imgEl);
                  }

                  const twoImgDiv = document.createElement("div");
                  twoImgDiv.classList.add("two-scenario-image-wrap");
                  twoImgDiv.classList.add("hide");
                  twoImgDiv.style.display = "none";
                  {
                    const imgDiv1 = document.createElement("div");
                    imgDiv1.id =
                      "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                    imgDiv1.classList.add("two-scenario-image");
                    {
                      const imgEl = document.createElement("img");
                      imgEl.classList.add("cover-image");
                      imgEl.loading = "lazy";
                      imgEl.alt = "";

                      imgDiv1.appendChild(imgEl);
                    }

                    const imgDiv2 = document.createElement("div");
                    imgDiv2.id =
                      "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                    imgDiv2.classList.add("two-scenario-image");
                    {
                      const imgEl = document.createElement("img");
                      imgEl.classList.add("cover-image");
                      imgEl.loading = "lazy";
                      imgEl.alt = "";

                      imgDiv2.appendChild(imgEl);
                    }

                    twoImgDiv.appendChild(imgDiv1);
                    twoImgDiv.appendChild(imgDiv2);
                  }

                  const oneVidDiv = document.createElement("div");
                  oneVidDiv.classList.add("w-video");
                  oneVidDiv.classList.add("w-embed");
                  oneVidDiv.classList.add("one-video");
                  oneVidDiv.classList.add("hide");
                  oneVidDiv.id =
                    "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                  {
                    const videoEl = document.createElement("video");
                    videoEl.autoplay = false;

                    oneVidDiv.appendChild(videoEl);
                  }

                  if (tweet.attachement_urls) {
                    const urls = tweet.attachement_urls;
                    const n = urls.length;
                    if (n === 1) {
                      oneImgDiv.classList.remove("hide");
                      oneImgDiv.querySelector("img").src = urls[0];
                    } else if (n == 2) {
                      twoImgDiv.classList.remove("hide");
                      twoImgDiv
                        .querySelectorAll("img")
                        .forEach((x, i) => (x.src = urls[i]));
                    }
                  }

                  postDiv.appendChild(postEl);
                  postDiv.appendChild(oneImgDiv);
                  postDiv.appendChild(twoImgDiv);
                  postDiv.appendChild(oneVidDiv);
                }

                const dateDiv = document.createElement("div");
                dateDiv.classList.add("date-text");
                dateDiv.classList.add("top-border-date");
                {
                  const timeEl = document.createElement("div");
                  timeEl.classList.add("post-time");
                  timeEl.textContent = created_at.time;

                  const dotEl = document.createElement("div");
                  dotEl.classList.add("span-dot");
                  {
                    const textEl = document.createTextNode(".");
                    dotEl.appendChild(textEl);
                  }

                  const dateEl = document.createElement("div");
                  dateEl.classList.add("post-date");
                  dateEl.textContent = created_at.date;

                  dateDiv.appendChild(timeEl);
                  dateDiv.appendChild(dotEl);
                  dateDiv.appendChild(dateEl);
                }

                boxDiv.appendChild(authorDiv);
                boxDiv.appendChild(postDiv);
                boxDiv.appendChild(dateDiv);
              }

              const bottomDiv = document.createElement("div");
              bottomDiv.classList.add("bottom-part-card");
              {
                const disclaimnerEl = document.createElement("div");
                disclaimnerEl.classList.add("disclaimer-text");
                disclaimnerEl.remove()

                const checkboxesContainer = document.createElement("div");
                checkboxesContainer.classList.add("checkboxes-wrapper");
                checkboxesContainer.classList.add("marginated");
                // checkboxesContainer.style.display = "none"
                {
                  const likeContainer = document.createElement("div");
                  likeContainer.classList.add("column");
                  likeContainer.style.display = "none";
                  {
                    const likeLabel = document.createElement("label");
                    likeLabel.classList.add("w-checkbox");
                    likeLabel.classList.add("universal-checkbox-like");
                    {
                      const iconDiv = document.createElement("div");
                      iconDiv.classList.add("w-checkbox-input");
                      iconDiv.classList.add(
                        "w-checkbox-input--inputType-custom"
                      );
                      iconDiv.classList.add("universal-checkbox-check-like");

                      const inputEl = document.createElement("input");
                      inputEl.id = "Loike-Checkbox-2";
                      inputEl.type = "checkbox";
                      inputEl.setAttribute("data-name", "Loike Checkbox 2");
                      inputEl.style.position = "absolute";
                      inputEl.style.opacity = "0";
                      inputEl.style.zIndex = "-1";

                      const spanEl = document.createElement("span");
                      spanEl.classList.add("w-form-label");
                      spanEl.classList.add("universal-label-like");
                      spanEl.setAttribute("for", "Loike-Checkbox-2");
                      spanEl.textContent = "Liked";

                      likeLabel.appendChild(iconDiv);
                      likeLabel.appendChild(inputEl);
                      likeLabel.appendChild(spanEl);
                    }

                    likeContainer.appendChild(likeLabel);
                  }

                  const replyContainer = document.createElement("div");
                  replyContainer.classList.add("column");
                  replyContainer.style.display = "none";
                  {
                    const replyLabel = document.createElement("label");
                    replyLabel.classList.add("w-checkbox");
                    replyLabel.classList.add("universal-checkbox-comment");
                    {
                      const iconDiv = document.createElement("div");
                      iconDiv.classList.add("w-checkbox-input");
                      iconDiv.classList.add(
                        "w-checkbox-input--inputType-custom"
                      );
                      iconDiv.classList.add("universal-checkbox-check-comment");

                      const inputEl = document.createElement("input");
                      inputEl.id = "Comment-Checkbox-2";
                      inputEl.type = "checkbox";
                      inputEl.setAttribute("data-name", "Comment Checkbox 2");
                      inputEl.style.position = "absolute";
                      inputEl.style.opacity = "0";
                      inputEl.style.zIndex = "-1";

                      const spanEl = document.createElement("span");
                      spanEl.classList.add("w-form-label");
                      spanEl.classList.add("universal-label-comment");
                      spanEl.setAttribute("for", "Comment-Checkbox-2");
                      spanEl.textContent = "Commented";

                      replyLabel.appendChild(iconDiv);
                      replyLabel.appendChild(inputEl);
                      replyLabel.appendChild(spanEl);
                    }

                    replyContainer.appendChild(replyLabel);
                  }

                  const retweetContainer = document.createElement("div");
                  retweetContainer.classList.add("column");
                  retweetContainer.style.display = "none";
                  {
                    const retweetLabel = document.createElement("label");
                    retweetLabel.classList.add("w-checkbox");
                    retweetLabel.classList.add("universal-checkbox-retweet");
                    {
                      const iconDiv = document.createElement("div");
                      iconDiv.classList.add("w-checkbox-input");
                      iconDiv.classList.add(
                        "w-checkbox-input--inputType-custom"
                      );
                      iconDiv.classList.add("universal-checkbox-check-retweet");

                      const inputEl = document.createElement("input");
                      inputEl.id = "Retweet-Checkbox-2";
                      inputEl.type = "checkbox";
                      inputEl.setAttribute("data-name", "Retweet Checkbox 2");
                      inputEl.style.position = "absolute";
                      inputEl.style.opacity = "0";
                      inputEl.style.zIndex = "-1";

                      const spanEl = document.createElement("span");
                      spanEl.classList.add("w-form-label");
                      spanEl.classList.add("universal-label-retweet");
                      spanEl.setAttribute("for", "Retweet-Checkbox-2");
                      spanEl.textContent = "Retweeted";

                      retweetLabel.appendChild(iconDiv);
                      retweetLabel.appendChild(inputEl);
                      retweetLabel.appendChild(spanEl);
                    }

                    retweetContainer.appendChild(retweetLabel);
                  }

                  checkboxesContainer.appendChild(likeContainer);
                  checkboxesContainer.appendChild(replyContainer);
                  checkboxesContainer.appendChild(retweetContainer);
                }

                const likeError = document.createElement("div");
                likeError.classList.add("universal-error-like");
                likeError.classList.add("hide");
                likeError.textContent =
                  "You've exceeded amount of tweets to be liked";

                const replyError = document.createElement("div");
                replyError.classList.add("universal-error-comment");
                replyError.classList.add("hide");
                replyError.textContent =
                  "You've exceeded amount of tweets to be commented";

                const retweetError = document.createElement("div");
                retweetError.classList.add("universal-error-retweet");
                retweetError.classList.add("hide");
                retweetError.textContent =
                  "You've exceeded amount of tweets to be retweeted";

                const submitBtn = document.createElement("input");
                submitBtn.classList.add("submit-button");
                submitBtn.classList.add("hover-button");
                submitBtn.classList.add("w-button");
                submitBtn.setAttribute("type", "submit");
                submitBtn.setAttribute("data-wait", "Please wait...");
                submitBtn.value = "Submit";

                const successEl = document.createElement("div");
                successEl.classList.add("success-text");
                successEl.classList.add("hide");
                successEl.textContent = "Successfully submitted your request!";

                bottomDiv.appendChild(disclaimnerEl);
                bottomDiv.appendChild(checkboxesContainer);
                bottomDiv.appendChild(likeError);
                bottomDiv.appendChild(replyError);
                bottomDiv.appendChild(retweetError);
                bottomDiv.appendChild(submitBtn);
                bottomDiv.appendChild(successEl);
              }

              formEl.appendChild(boxDiv);
              formEl.appendChild(bottomDiv);
              formEl.addEventListener("submit", async function (ev) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                ev.stopPropagation();
                // RETWEETS
                try {
                  const retweets =
                      await apiCall.getReq<ActionResponse>(
                          `/user/retweet/${tid}`
                      );
                  if (retweets.limit_exceeded)
                    handleResponse("retweet", true);
                } catch (error) {
                  console.error(error);
                }
                // RETWEETS
                // LIKES
                try {
                  const likes = await apiCall.getReq<ActionResponse>(
                      `/user/like/${tid}`
                  );
                  if (likes.limit_exceeded)
                    handleResponse("like", true);
                  // rootEl.remove();
                } catch (error) {
                  console.error(error);
                }
                //LIKES
                //COMMENTED
                try {
                  const textEl = formEl.querySelector("textarea");
                  if (textEl.value) {
                    const response =
                        await apiCall.postReq<ActionResponse>(
                            `/user/reply/${tid}`,
                            {
                              id: tid,
                              text: textEl.value,
                            }
                        );
                    if (response.limit_exceeded)
                      handleResponse("commentd", true);
                    // rootEl.remove();
                  }
                } catch (error) {
                  console.error(error);
                }
                //COMMENTED
                const msgMap = {
                  like: "universal-error-like",
                  reply: "universal-error-comment",
                  retweet: "universal-error-retweet",
                };
                const inputs = [
                  {
                    tag: "like",
                    query: "#Loike-Checkbox-2",
                  },
                  {
                    tag: "reply",
                    query: "#Comment-Checkbox-2",
                  },
                  {
                    tag: "retweet",
                    query: "#Retweet-Checkbox-2",
                  },
                ];

                const successEl = formEl.querySelector(".success-text");
                Object.keys(msgMap).forEach((x) =>
                    formEl.querySelector(`.${msgMap[x]}`).classList.add("hide")
                );
                successEl.classList.add("hide");

                const tasks = ["like", "reply", "retweet"];
                // for (const input of inputs) {
                //   const inputEl = this.querySelector<HTMLInputElement>(
                //     input.query
                //   );
                //   if (inputEl.checked)
                //   tasks.push(input.tag);
                // }

                try {
                  type ForwardTweetsRespData = {
                    messages: {
                      tag: string;
                      status: boolean;
                      message: string;
                    }[];
                    limit_exceeded: boolean;
                  };
                  const resp = await apiCall.postReq<ForwardTweetsRespData>(
                      "/user/forward-tweets",
                      {
                        id: tid,
                        tasks,
                      }
                  );
                  const { messages, limit_exceeded } = resp;

                  let flag = true;
                  messages.forEach((x) => {
                    const msgEl = formEl.querySelector(`.${msgMap[x.tag]}`);
                    if (msgEl && !x.status) {
                      msgEl.classList.remove("hide");
                      setTimeout(() => msgEl.classList.add("hide"), 3000);
                      flag = false;
                    }
                  });

                  if (flag) {
                    successEl.classList.remove("hide");
                    setTimeout(() => successEl.classList.add("hide"), 3000);
                  }
                  if (limit_exceeded) {
                    setTimeout(() => handleResponse("your", true), 3000);
                  }
                } catch (error) {
                  console.error(error);
                }
              });
            }

            formDiv.appendChild(formEl);
          }

          rootEl.appendChild(formDiv);
        }

        containerEl.appendChild(rootEl);
      }

      if (tweets.length === 0) {
        document.getElementById("your-none").style.display = "block";
        document.getElementById("your-overall").style.display = "none";
      }

      document.getElementById("your-preloader").remove();
    }

    // MY TODO
    {
      // fetching tweets to like
      {
        try {
          const { tweets: tweetsToLike, limit_exceeded: limit_exceeded_like } =
            await apiCall.getReq<GetTweetsResp>("/user/tweets/like");

          const likeLoader = $(document.getElementById("like-preloader"));
          const containerElLike = document.getElementById("like-swiper");

          if (limit_exceeded_like) handleResponse("like", true);

          containerElLike
            .querySelectorAll(".swiper-slide")
            .forEach((x) => x.remove());

          for (let i = 0; i < tweetsToLike.length; i++) {
            const tweet: TodoTweetObj = tweetsToLike[i];

            const { id: tid, text, created_at, author_details } = tweet;

            // added like button

            const createLikeButton = () => {
              const likeOverAll = document.getElementById("like-overall");
              const container = likeOverAll.querySelectorAll(".container");
              const likeButtonContainer = document.createElement("div");
              const likeTooltip = document.createElement("p");
              likeTooltip.classList.add("like-tooltip");
              likeTooltip.textContent = "Like all";
              Object.assign(likeTooltip.style, {position: "absolute", top: "-6%", background: "black", padding: "2.5px 5px", borderRadius: "10px" });
              likeButtonContainer.className = "like-button-container";
              Object.assign(likeButtonContainer.style, { margin: "0 25px", poition: "relative" });
              container[0].appendChild(likeButtonContainer);
              const likeContainer = document.createElement("div");
              likeContainer.classList.add("column");
              {
                const likeLabel = document.createElement("label");
                likeLabel.classList.add("w-checkbox");
                likeLabel.classList.add("like-checkbox");
                likeLabel.style.paddingBottom = "40px";
                {
                  const iconDiv = document.createElement("div");
                  iconDiv.classList.add("w-checkbox-input");
                  iconDiv.classList.add(
                      "w-checkbox-input--inputType-custom"
                  );
                  iconDiv.classList.add("like-checkbox-check");
                  Object.assign(iconDiv.style, { width: "25px", height: "25px" });
                  const inputEl = document.createElement("input");
                  inputEl.id = "Loike-Checkbox-2";
                  inputEl.type = "checkbox";
                  inputEl.setAttribute("data-name", "Loike Checkbox 2");
                  inputEl.style.position = "absolute";
                  inputEl.style.opacity = "0";
                  inputEl.style.zIndex = "-1";

                  {
                    inputEl.addEventListener("change", async () => {
                      for (const tweet of tweetsToLike) {
                        if (inputEl.checked) {
                          try {
                            containerElLike
                                .querySelectorAll(".swiper-slide")
                                .forEach((x) => x.remove());
                            const resp =
                                await apiCall.getReq<ActionResponse>(
                                    `/user/like/${tweet.id}`
                                );
                            if (resp.limit_exceeded)
                              handleResponse("like", true);
                          } catch (error) {
                            console.error(error);
                          }
                        }
                      }
                    });
                  }

                  const spanEl = document.createElement("span");
                  spanEl.classList.add("w-form-label");
                  spanEl.classList.add("checkbox-label-card");
                  spanEl.setAttribute("for", "Loike-Checkbox-2");
                  spanEl.textContent = "Like";

                  likeLabel.appendChild(iconDiv);
                  likeLabel.appendChild(inputEl);
                }

                const likeError = document.createElement("div");
                likeError.classList.add("error-like");
                likeError.classList.add("hide");
                likeError.textContent =
                    "You've exceeded amount of tweets to be liked";

                likeContainer.appendChild(likeLabel);
                likeContainer.appendChild(likeError);
              }

              likeButtonContainer.appendChild(likeContainer);
              likeButtonContainer.appendChild(likeTooltip)
            }

            createLikeButton();

            // added like button

            // creating tweet element
            const rootEl = document.createElement("div");
            rootEl.classList.add("swiper-slide");
            {
              const formDiv = document.createElement("div");
              formDiv.classList.add("form-block-twitter");
              formDiv.classList.add("w-form");
              {
                const formEl = document.createElement("form");
                formEl.classList.add("form-twitter");
                {
                  const boxDiv = document.createElement("div");
                  boxDiv.classList.add("form-card");
                  {
                    const authorDiv = document.createElement("div");
                    authorDiv.classList.add("twitter-author");
                    {
                      const profileImg = document.createElement("img");
                      profileImg.classList.add("twitter-author-image");
                      profileImg.loading = "lazy";
                      profileImg.src = author_details.profile_image_url;
                      profileImg.alt = "";

                      const colDiv = document.createElement("div");
                      colDiv.classList.add("column");
                      colDiv.style.width = "100%";
                      {
                        const nameEl = document.createElement("div");
                        nameEl.classList.add("name-text");
                        nameEl.textContent = author_details.name;

                        const handleEl = document.createElement("div");
                        handleEl.classList.add("handle-text");
                        handleEl.textContent = `@${author_details.username}`;

                        colDiv.appendChild(nameEl);
                        colDiv.appendChild(handleEl);
                      }

                      const iconDiv = document.createElement("img");
                      iconDiv.classList.add("twitter-icon-image");
                      iconDiv.sizes = "20px";
                      iconDiv.loading = "lazy";
                      iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                      iconDiv.src =
                        "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                      authorDiv.appendChild(profileImg);
                      authorDiv.appendChild(colDiv);
                      authorDiv.appendChild(iconDiv);
                    }

                    const postDiv = document.createElement("div");
                    postDiv.classList.add("overflow-block");
                    {
                      const postEl = document.createElement("p");
                      postEl.classList.add("post-text");
                      postEl.innerHTML = text;

                      const oneImgDiv = document.createElement("div");
                      oneImgDiv.classList.add("one-scenario-image");
                      oneImgDiv.classList.add("hide");
                      {
                        const imgEl = document.createElement("img");
                        imgEl.classList.add("cover-image");
                        imgEl.loading = "lazy";
                        imgEl.alt = "";

                        oneImgDiv.appendChild(imgEl);
                      }

                      const twoImgDiv = document.createElement("div");
                      twoImgDiv.classList.add("two-scenario-image-wrap");
                      twoImgDiv.classList.add("hide");
                      twoImgDiv.style.display = "none";
                      {
                        const imgDiv1 = document.createElement("div");
                        imgDiv1.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                        imgDiv1.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv1.appendChild(imgEl);
                        }

                        const imgDiv2 = document.createElement("div");
                        imgDiv2.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                        imgDiv2.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv2.appendChild(imgEl);
                        }

                        twoImgDiv.appendChild(imgDiv1);
                        twoImgDiv.appendChild(imgDiv2);
                      }

                      const oneVidDiv = document.createElement("div");
                      oneVidDiv.classList.add("w-video");
                      oneVidDiv.classList.add("w-embed");
                      oneVidDiv.classList.add("one-video");
                      oneVidDiv.classList.add("hide");
                      oneVidDiv.id =
                        "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                      {
                        const videoEl = document.createElement("video");
                        videoEl.autoplay = false;

                        oneVidDiv.appendChild(videoEl);
                      }

                      if (tweet.attachement_urls) {
                        const urls = tweet.attachement_urls;
                        const n = urls.length;
                        if (n === 1) {
                          oneImgDiv.classList.remove("hide");
                          oneImgDiv.querySelector("img").src = urls[0];
                        } else if (n == 2) {
                          twoImgDiv.classList.remove("hide");
                          twoImgDiv
                            .querySelectorAll("img")
                            .forEach((x, i) => (x.src = urls[i]));
                        }
                      }

                      postDiv.appendChild(postEl);
                      postDiv.appendChild(oneImgDiv);
                      postDiv.appendChild(twoImgDiv);
                      postDiv.appendChild(oneVidDiv);
                    }

                    const dateDiv = document.createElement("div");
                    dateDiv.classList.add("date-text");
                    {
                      const timeEl = document.createElement("div");
                      timeEl.classList.add("post-time");
                      timeEl.textContent = created_at.time;

                      const dotEl = document.createElement("div");
                      dotEl.classList.add("span-dot");
                      {
                        const textEl = document.createTextNode(".");
                        dotEl.appendChild(textEl);
                      }

                      const dateEl = document.createElement("div");
                      dateEl.classList.add("post-date");
                      dateEl.textContent = created_at.date;

                      dateDiv.appendChild(timeEl);
                      dateDiv.appendChild(dotEl);
                      dateDiv.appendChild(dateEl);
                    }

                    const checkboxesContainer = document.createElement("div");
                    checkboxesContainer.classList.add("checkboxes-wrapper");
                    {
                      const likeContainer = document.createElement("div");
                      likeContainer.classList.add("column");
                      {
                        const likeLabel = document.createElement("label");
                        likeLabel.classList.add("w-checkbox");
                        likeLabel.classList.add("like-checkbox");
                        {
                          const iconDiv = document.createElement("div");
                          iconDiv.classList.add("w-checkbox-input");
                          iconDiv.classList.add(
                            "w-checkbox-input--inputType-custom"
                          );
                          iconDiv.classList.add("like-checkbox-check");

                          const inputEl = document.createElement("input");
                          inputEl.id = "Loike-Checkbox-2";
                          inputEl.type = "checkbox";
                          inputEl.setAttribute("data-name", "Loike Checkbox 2");
                          inputEl.style.position = "absolute";
                          inputEl.style.opacity = "0";
                          inputEl.style.zIndex = "-1";
                          {
                            inputEl.addEventListener("change", async () => {
                              if (inputEl.checked) {
                                try {
                                  rootEl.remove();
                                  const resp =
                                    await apiCall.getReq<ActionResponse>(
                                      `/user/like/${tid}`
                                    );
                                  if (resp.limit_exceeded)
                                    handleResponse("like", true);
                                } catch (error) {
                                  console.error(error);
                                }
                              }
                            });
                          }

                          const spanEl = document.createElement("span");
                          spanEl.classList.add("w-form-label");
                          spanEl.classList.add("checkbox-label-card");
                          spanEl.setAttribute("for", "Loike-Checkbox-2");
                          spanEl.textContent = "Like";

                          likeLabel.appendChild(iconDiv);
                          likeLabel.appendChild(inputEl);
                          likeLabel.appendChild(spanEl);
                        }

                        const likeError = document.createElement("div");
                        likeError.classList.add("error-like");
                        likeError.classList.add("hide");
                        likeError.textContent =
                          "You've exceeded amount of tweets to be liked";

                        likeContainer.appendChild(likeLabel);
                        likeContainer.appendChild(likeError);
                      }

                      checkboxesContainer.appendChild(likeContainer);
                    }

                    boxDiv.appendChild(authorDiv);
                    boxDiv.appendChild(postDiv);
                    boxDiv.appendChild(dateDiv);
                    boxDiv.appendChild(checkboxesContainer);
                  }

                  formEl.appendChild(boxDiv);
                }

                formDiv.appendChild(formEl);
              }

              rootEl.appendChild(formDiv);
            }

            containerElLike.appendChild(rootEl);
          }

          likeLoader.css("display", "none");

          document
            .querySelector("a.refresh-liked")
            .addEventListener("click", async () => {
              try {
                likeLoader.css("display", "block");
                const randomArray = shuffle(tweetsToLike.length);

                containerElLike
                  .querySelectorAll(".swiper-slide")
                  .forEach((x) => x.remove());

                for (let i = 0; i < tweetsToLike.length; i++) {
                  const tweet: TodoTweetObj = tweetsToLike[randomArray[i]];

                  const { id: tid, text, created_at, author_details } = tweet;

                  // creating tweet element
                  const rootEl = document.createElement("div");
                  rootEl.classList.add("swiper-slide");
                  {
                    const formDiv = document.createElement("div");
                    formDiv.classList.add("form-block-twitter");
                    formDiv.classList.add("w-form");
                    {
                      const formEl = document.createElement("form");
                      formEl.classList.add("form-twitter");
                      {
                        const boxDiv = document.createElement("div");
                        boxDiv.classList.add("form-card");
                        {
                          const authorDiv = document.createElement("div");
                          authorDiv.classList.add("twitter-author");
                          {
                            const profileImg = document.createElement("img");
                            profileImg.classList.add("twitter-author-image");
                            profileImg.loading = "lazy";
                            profileImg.src = author_details.profile_image_url;
                            profileImg.alt = "";

                            const colDiv = document.createElement("div");
                            colDiv.classList.add("column");
                            colDiv.style.width = "100%";
                            {
                              const nameEl = document.createElement("div");
                              nameEl.classList.add("name-text");
                              nameEl.textContent = author_details.name;

                              const handleEl = document.createElement("div");
                              handleEl.classList.add("handle-text");
                              handleEl.textContent = `@${author_details.username}`;

                              colDiv.appendChild(nameEl);
                              colDiv.appendChild(handleEl);
                            }

                            const iconDiv = document.createElement("img");
                            iconDiv.classList.add("twitter-icon-image");
                            iconDiv.sizes = "20px";
                            iconDiv.loading = "lazy";
                            iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                            iconDiv.src =
                              "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                            authorDiv.appendChild(profileImg);
                            authorDiv.appendChild(colDiv);
                            authorDiv.appendChild(iconDiv);
                          }

                          const postDiv = document.createElement("div");
                          postDiv.classList.add("overflow-block");
                          {
                            const postEl = document.createElement("p");
                            postEl.classList.add("post-text");
                            postEl.innerHTML = text;

                            const oneImgDiv = document.createElement("div");
                            oneImgDiv.classList.add("one-scenario-image");
                            oneImgDiv.classList.add("hide");
                            {
                              const imgEl = document.createElement("img");
                              imgEl.classList.add("cover-image");
                              imgEl.loading = "lazy";
                              imgEl.alt = "";

                              oneImgDiv.appendChild(imgEl);
                            }

                            const twoImgDiv = document.createElement("div");
                            twoImgDiv.classList.add("two-scenario-image-wrap");
                            twoImgDiv.classList.add("hide");
                            twoImgDiv.style.display = "none";
                            {
                              const imgDiv1 = document.createElement("div");
                              imgDiv1.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                              imgDiv1.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv1.appendChild(imgEl);
                              }

                              const imgDiv2 = document.createElement("div");
                              imgDiv2.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                              imgDiv2.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv2.appendChild(imgEl);
                              }

                              twoImgDiv.appendChild(imgDiv1);
                              twoImgDiv.appendChild(imgDiv2);
                            }

                            const oneVidDiv = document.createElement("div");
                            oneVidDiv.classList.add("w-video");
                            oneVidDiv.classList.add("w-embed");
                            oneVidDiv.classList.add("one-video");
                            oneVidDiv.classList.add("hide");
                            oneVidDiv.id =
                              "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                            {
                              const videoEl = document.createElement("video");
                              videoEl.autoplay = false;

                              oneVidDiv.appendChild(videoEl);
                            }

                            if (tweet.attachement_urls) {
                              const urls = tweet.attachement_urls;
                              const n = urls.length;
                              if (n === 1) {
                                oneImgDiv.classList.remove("hide");
                                oneImgDiv.querySelector("img").src = urls[0];
                              } else if (n == 2) {
                                twoImgDiv.classList.remove("hide");
                                twoImgDiv
                                  .querySelectorAll("img")
                                  .forEach((x, i) => (x.src = urls[i]));
                              }
                            }

                            postDiv.appendChild(postEl);
                            postDiv.appendChild(oneImgDiv);
                            postDiv.appendChild(twoImgDiv);
                            postDiv.appendChild(oneVidDiv);
                          }

                          const dateDiv = document.createElement("div");
                          dateDiv.classList.add("date-text");
                          {
                            const timeEl = document.createElement("div");
                            timeEl.classList.add("post-time");
                            timeEl.textContent = created_at.time;

                            const dotEl = document.createElement("div");
                            dotEl.classList.add("span-dot");
                            {
                              const textEl = document.createTextNode(".");
                              dotEl.appendChild(textEl);
                            }

                            const dateEl = document.createElement("div");
                            dateEl.classList.add("post-date");
                            dateEl.textContent = created_at.date;

                            dateDiv.appendChild(timeEl);
                            dateDiv.appendChild(dotEl);
                            dateDiv.appendChild(dateEl);
                          }

                          const checkboxesContainer =
                            document.createElement("div");
                          checkboxesContainer.classList.add(
                            "checkboxes-wrapper"
                          );
                          {
                            const likeContainer = document.createElement("div");
                            likeContainer.classList.add("column");
                            {
                              const likeLabel = document.createElement("label");
                              likeLabel.classList.add("w-checkbox");
                              likeLabel.classList.add("like-checkbox");
                              {
                                const iconDiv = document.createElement("div");
                                iconDiv.classList.add("w-checkbox-input");
                                iconDiv.classList.add(
                                  "w-checkbox-input--inputType-custom"
                                );
                                iconDiv.classList.add("like-checkbox-check");

                                const inputEl = document.createElement("input");
                                inputEl.id = "Loike-Checkbox-2";
                                inputEl.type = "checkbox";
                                inputEl.setAttribute(
                                  "data-name",
                                  "Loike Checkbox 2"
                                );
                                inputEl.style.position = "absolute";
                                inputEl.style.opacity = "0";
                                inputEl.style.zIndex = "-1";
                                {
                                  inputEl.addEventListener(
                                    "change",
                                    async () => {
                                      if (inputEl.checked) {
                                        try {
                                          const resp =
                                            await apiCall.getReq<ActionResponse>(
                                              `/user/like/${tid}`
                                            );
                                          if (resp.limit_exceeded)
                                            handleResponse("like", true);
                                          rootEl.remove();
                                        } catch (error) {
                                          console.error(error);
                                        }
                                      }
                                    }
                                  );
                                }

                                const spanEl = document.createElement("span");
                                spanEl.classList.add("w-form-label");
                                spanEl.classList.add("checkbox-label-card");
                                spanEl.setAttribute("for", "Loike-Checkbox-2");
                                spanEl.textContent = "Like";

                                likeLabel.appendChild(iconDiv);
                                likeLabel.appendChild(inputEl);
                                likeLabel.appendChild(spanEl);
                              }

                              const likeError = document.createElement("div");
                              likeError.classList.add("error-like");
                              likeError.classList.add("hide");
                              likeError.textContent =
                                "You've exceeded amount of tweets to be liked";

                              likeContainer.appendChild(likeLabel);
                              likeContainer.appendChild(likeError);
                            }

                            checkboxesContainer.appendChild(likeContainer);
                          }

                          boxDiv.appendChild(authorDiv);
                          boxDiv.appendChild(postDiv);
                          boxDiv.appendChild(dateDiv);
                          boxDiv.appendChild(checkboxesContainer);
                        }

                        formEl.appendChild(boxDiv);
                      }

                      formDiv.appendChild(formEl);
                    }

                    rootEl.appendChild(formDiv);
                  }

                  containerElLike.appendChild(rootEl);
                }

                likeLoader.css("display", "none");
              } catch (error) {
                console.error(error);
              }
            });
        } catch (error) {
          console.error(error);
        }
      }

      // fetching tweets to comment
      {
        try {
          let { tweets: tweetsToReply, limit_exceeded: limit_exceeded_reply } =
            await apiCall.getReq<GetTweetsResp>("/user/tweets/reply");

          const replyLoader = $(document.getElementById("comment-preloader"));
          const containerElReply = document.getElementById("comment-swiper");

          if (limit_exceeded_reply) handleResponse("comment", true);

          containerElReply
            .querySelectorAll(".swiper-slide")
            .forEach((x) => x.remove());

          for (let i = 0; i < tweetsToReply.length; i++) {
            const tweet: TodoTweetObj = tweetsToReply[i];

            const { id: tid, text, created_at, author_details } = tweet;

            // creating tweet element
            const rootEl = document.createElement("div");
            rootEl.classList.add("swiper-slide");
            {
              const formDiv = document.createElement("div");
              formDiv.classList.add("form-block-twitter");
              formDiv.classList.add("w-form");
              {
                const formEl = document.createElement("form");
                formEl.classList.add("form-twitter");
                {
                  const boxDiv = document.createElement("div");
                  boxDiv.classList.add("form-card");
                  {
                    const authorDiv = document.createElement("div");
                    authorDiv.classList.add("twitter-author");
                    {
                      const profileImg = document.createElement("img");
                      profileImg.classList.add("twitter-author-image");
                      profileImg.loading = "lazy";
                      profileImg.src = author_details.profile_image_url;
                      profileImg.alt = "";

                      const colDiv = document.createElement("div");
                      colDiv.classList.add("column");
                      colDiv.style.width = "100%";
                      {
                        const nameEl = document.createElement("div");
                        nameEl.classList.add("name-text");
                        nameEl.textContent = author_details.name;

                        const handleEl = document.createElement("div");
                        handleEl.classList.add("handle-text");
                        handleEl.textContent = `@${author_details.username}`;

                        colDiv.appendChild(nameEl);
                        colDiv.appendChild(handleEl);
                      }

                      const iconDiv = document.createElement("img");
                      iconDiv.classList.add("twitter-icon-image");
                      iconDiv.sizes = "20px";
                      iconDiv.loading = "lazy";
                      iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                      iconDiv.src =
                        "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                      authorDiv.appendChild(profileImg);
                      authorDiv.appendChild(colDiv);
                      authorDiv.appendChild(iconDiv);
                    }

                    const postDiv = document.createElement("div");
                    postDiv.classList.add("overflow-block");
                    {
                      const postEl = document.createElement("p");
                      postEl.classList.add("post-text");
                      postEl.innerHTML = text;

                      const oneImgDiv = document.createElement("div");
                      oneImgDiv.classList.add("one-scenario-image");
                      oneImgDiv.classList.add("hide");
                      {
                        const imgEl = document.createElement("img");
                        imgEl.classList.add("cover-image");
                        imgEl.loading = "lazy";
                        imgEl.alt = "";

                        oneImgDiv.appendChild(imgEl);
                      }

                      const twoImgDiv = document.createElement("div");
                      twoImgDiv.classList.add("two-scenario-image-wrap");
                      twoImgDiv.classList.add("hide");
                      twoImgDiv.style.display = "none";
                      {
                        const imgDiv1 = document.createElement("div");
                        imgDiv1.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                        imgDiv1.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv1.appendChild(imgEl);
                        }

                        const imgDiv2 = document.createElement("div");
                        imgDiv2.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                        imgDiv2.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv2.appendChild(imgEl);
                        }

                        twoImgDiv.appendChild(imgDiv1);
                        twoImgDiv.appendChild(imgDiv2);
                      }

                      const oneVidDiv = document.createElement("div");
                      oneVidDiv.classList.add("w-video");
                      oneVidDiv.classList.add("w-embed");
                      oneVidDiv.classList.add("one-video");
                      oneVidDiv.classList.add("hide");
                      oneVidDiv.id =
                        "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                      {
                        const videoEl = document.createElement("video");
                        videoEl.autoplay = false;

                        oneVidDiv.appendChild(videoEl);
                      }

                      if (tweet.attachement_urls) {
                        const urls = tweet.attachement_urls;
                        const n = urls.length;
                        if (n === 1) {
                          oneImgDiv.classList.remove("hide");
                          oneImgDiv.querySelector("img").src = urls[0];
                        } else if (n == 2) {
                          twoImgDiv.classList.remove("hide");
                          twoImgDiv
                            .querySelectorAll("img")
                            .forEach((x, i) => (x.src = urls[i]));
                        }
                      }

                      postDiv.appendChild(postEl);
                      postDiv.appendChild(oneImgDiv);
                      postDiv.appendChild(twoImgDiv);
                      postDiv.appendChild(oneVidDiv);
                    }

                    const dateDiv = document.createElement("div");
                    dateDiv.classList.add("date-text");
                    {
                      const timeEl = document.createElement("div");
                      timeEl.classList.add("post-time");
                      timeEl.textContent = created_at.time;

                      const dotEl = document.createElement("div");
                      dotEl.classList.add("span-dot");
                      {
                        const textEl = document.createTextNode(".");
                        dotEl.appendChild(textEl);
                      }

                      const dateEl = document.createElement("div");
                      dateEl.classList.add("post-date");
                      dateEl.textContent = created_at.date;

                      dateDiv.appendChild(timeEl);
                      dateDiv.appendChild(dotEl);
                      dateDiv.appendChild(dateEl);
                    }

                    const checkboxesContainer = document.createElement("div");
                    checkboxesContainer.classList.add("checkboxes-wrapper");
                    {
                      const replyContainer = document.createElement("div");
                      replyContainer.classList.add("column");
                      replyContainer.setAttribute(
                        "data-w-id",
                        "48652e03-98b1-c9e0-2cfc-1cf2558c7403"
                      );
                      {
                        const replyLabel = document.createElement("div");
                        replyLabel.classList.add("comment-checkbox");
                        {
                          const iconDiv = document.createElement("div");
                          iconDiv.classList.add("comment-checkbox-check");

                          const labelText = document.createElement("div");
                          labelText.classList.add("checkbox-label-card");
                          labelText.textContent = "Comment";

                          replyLabel.appendChild(iconDiv);
                          replyLabel.appendChild(labelText);
                        }

                        const replyError = document.createElement("div");
                        replyError.classList.add("comment-error");
                        replyError.classList.add("hide");
                        replyError.textContent =
                          "You've exceeded amount of tweets to be commented";

                        replyContainer.appendChild(replyLabel);
                        replyContainer.appendChild(replyError);
                      }

                      const replyInputContainer = document.createElement("div");
                      replyInputContainer.classList.add("comment-wrapper");
                      {
                        const textEl = document.createElement("textarea");
                        textEl.id = "field-2";
                        textEl.classList.add("twitter-comment-input");
                        textEl.classList.add("w-input");
                        textEl.placeholder = "Your reply";
                        textEl.maxLength = 5000;
                        textEl.name = "field-2";
                        textEl.setAttribute("data-name", "field");

                        const xComment = document.createElement("div");
                        xComment.classList.add("x-comment");
                        xComment.setAttribute(
                          "data-w-id",
                          "7d49dde2-22af-3af3-4d2a-6779b7115ead"
                        );
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.src =
                            "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62a1c558370c3e8bfb46546a_16x16%20input%20arrow.svg";
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          xComment.appendChild(imgEl);
                        }

                        replyInputContainer.appendChild(textEl);
                        replyInputContainer.appendChild(xComment);
                      }

                      replyContainer.addEventListener(
                        "click",
                        async function () {
                          const $this = $(replyInputContainer);
                          $this.css("display", "flex");
                          $this.addClass("active-comment-wrapper");
                        }
                      );
                      replyInputContainer
                        .querySelector(".x-comment")
                        .addEventListener("click", async function () {
                          const $this = $(replyInputContainer);
                          $this.removeClass("active-comment-wrapper");
                          setTimeout(() => $this.css("display", "none"), 250);
                        });

                      checkboxesContainer.appendChild(replyContainer);
                      checkboxesContainer.appendChild(replyInputContainer);
                    }

                    const submitBtn = document.createElement("input");
                    submitBtn.classList.add("submit-button");
                    submitBtn.classList.add("w-button");
                    submitBtn.setAttribute("type", "submit");
                    submitBtn.setAttribute("data-wait", "Please wait...");
                    submitBtn.value = "Submit";

                    boxDiv.appendChild(authorDiv);
                    boxDiv.appendChild(postDiv);
                    boxDiv.appendChild(dateDiv);
                    boxDiv.appendChild(checkboxesContainer);
                    boxDiv.appendChild(submitBtn);
                  }

                  formEl.appendChild(boxDiv);
                }

                formEl.addEventListener("submit", async function (ev) {
                  ev.preventDefault();
                  ev.stopImmediatePropagation();
                  ev.stopPropagation();
                  // SUBMIT START
                  try {
                    const textEl = formEl.querySelector("textarea");
                    if (textEl.value) {
                      rootEl.remove();
                      const resp = await apiCall.postReq<ActionResponse>(
                        `/user/reply/${tid}`,
                        {
                          id: tid,
                          text: textEl.value,
                          username: author_details.username,
                        }
                      );
                      if (resp.limit_exceeded) handleResponse("comment", true);
                    }
                  } catch (error) {
                    console.error(error);
                  }
                });

                formDiv.appendChild(formEl);
              }

              rootEl.appendChild(formDiv);
            }

            containerElReply.appendChild(rootEl);
          }

          replyLoader.css("display", "none");

          document
            .querySelector("a.refresh-commented")
            .addEventListener("click", async () => {
              try {
                replyLoader.css("display", "block");
                const randomArray = shuffle(tweetsToReply.length);

                containerElReply
                  .querySelectorAll(".swiper-slide")
                  .forEach((x) => x.remove());

                for (let i = 0; i < tweetsToReply.length; i++) {
                  const tweet: TodoTweetObj = tweetsToReply[randomArray[i]];

                  const { id: tid, text, created_at, author_details } = tweet;

                  // creating tweet element
                  const rootEl = document.createElement("div");
                  rootEl.classList.add("swiper-slide");
                  {
                    const formDiv = document.createElement("div");
                    formDiv.classList.add("form-block-twitter");
                    formDiv.classList.add("w-form");
                    {
                      const formEl = document.createElement("form");
                      formEl.classList.add("form-twitter");
                      {
                        const boxDiv = document.createElement("div");
                        boxDiv.classList.add("form-card");
                        {
                          const authorDiv = document.createElement("div");
                          authorDiv.classList.add("twitter-author");
                          {
                            const profileImg = document.createElement("img");
                            profileImg.classList.add("twitter-author-image");
                            profileImg.loading = "lazy";
                            profileImg.src = author_details.profile_image_url;
                            profileImg.alt = "";

                            const colDiv = document.createElement("div");
                            colDiv.classList.add("column");
                            colDiv.style.width = "100%";
                            {
                              const nameEl = document.createElement("div");
                              nameEl.classList.add("name-text");
                              nameEl.textContent = author_details.name;

                              const handleEl = document.createElement("div");
                              handleEl.classList.add("handle-text");
                              handleEl.textContent = `@${author_details.username}`;

                              colDiv.appendChild(nameEl);
                              colDiv.appendChild(handleEl);
                            }

                            const iconDiv = document.createElement("img");
                            iconDiv.classList.add("twitter-icon-image");
                            iconDiv.sizes = "20px";
                            iconDiv.loading = "lazy";
                            iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                            iconDiv.src =
                              "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                            authorDiv.appendChild(profileImg);
                            authorDiv.appendChild(colDiv);
                            authorDiv.appendChild(iconDiv);
                          }

                          const postDiv = document.createElement("div");
                          postDiv.classList.add("overflow-block");
                          {
                            const postEl = document.createElement("p");
                            postEl.classList.add("post-text");
                            postEl.innerHTML = text;

                            const oneImgDiv = document.createElement("div");
                            oneImgDiv.classList.add("one-scenario-image");
                            oneImgDiv.classList.add("hide");
                            {
                              const imgEl = document.createElement("img");
                              imgEl.classList.add("cover-image");
                              imgEl.loading = "lazy";
                              imgEl.alt = "";

                              oneImgDiv.appendChild(imgEl);
                            }

                            const twoImgDiv = document.createElement("div");
                            twoImgDiv.classList.add("two-scenario-image-wrap");
                            twoImgDiv.classList.add("hide");
                            twoImgDiv.style.display = "none";
                            {
                              const imgDiv1 = document.createElement("div");
                              imgDiv1.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                              imgDiv1.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv1.appendChild(imgEl);
                              }

                              const imgDiv2 = document.createElement("div");
                              imgDiv2.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                              imgDiv2.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv2.appendChild(imgEl);
                              }

                              twoImgDiv.appendChild(imgDiv1);
                              twoImgDiv.appendChild(imgDiv2);
                            }

                            const oneVidDiv = document.createElement("div");
                            oneVidDiv.classList.add("w-video");
                            oneVidDiv.classList.add("w-embed");
                            oneVidDiv.classList.add("one-video");
                            oneVidDiv.classList.add("hide");
                            oneVidDiv.id =
                              "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                            {
                              const videoEl = document.createElement("video");
                              videoEl.autoplay = false;

                              oneVidDiv.appendChild(videoEl);
                            }

                            if (tweet.attachement_urls) {
                              const urls = tweet.attachement_urls;
                              const n = urls.length;
                              if (n === 1) {
                                oneImgDiv.classList.remove("hide");
                                oneImgDiv.querySelector("img").src = urls[0];
                              } else if (n == 2) {
                                twoImgDiv.classList.remove("hide");
                                twoImgDiv
                                  .querySelectorAll("img")
                                  .forEach((x, i) => (x.src = urls[i]));
                              }
                            }

                            postDiv.appendChild(postEl);
                            postDiv.appendChild(oneImgDiv);
                            postDiv.appendChild(twoImgDiv);
                            postDiv.appendChild(oneVidDiv);
                          }

                          const dateDiv = document.createElement("div");
                          dateDiv.classList.add("date-text");
                          {
                            const timeEl = document.createElement("div");
                            timeEl.classList.add("post-time");
                            timeEl.textContent = created_at.time;

                            const dotEl = document.createElement("div");
                            dotEl.classList.add("span-dot");
                            {
                              const textEl = document.createTextNode(".");
                              dotEl.appendChild(textEl);
                            }

                            const dateEl = document.createElement("div");
                            dateEl.classList.add("post-date");
                            dateEl.textContent = created_at.date;

                            dateDiv.appendChild(timeEl);
                            dateDiv.appendChild(dotEl);
                            dateDiv.appendChild(dateEl);
                          }

                          const checkboxesContainer =
                            document.createElement("div");
                          checkboxesContainer.classList.add(
                            "checkboxes-wrapper"
                          );
                          {
                            const replyContainer =
                              document.createElement("div");
                            replyContainer.classList.add("column");
                            replyContainer.setAttribute(
                              "data-w-id",
                              "48652e03-98b1-c9e0-2cfc-1cf2558c7403"
                            );
                            {
                              const replyLabel = document.createElement("div");
                              replyLabel.classList.add("comment-checkbox");
                              {
                                const iconDiv = document.createElement("div");
                                iconDiv.classList.add("comment-checkbox-check");

                                const labelText = document.createElement("div");
                                labelText.classList.add("checkbox-label-card");
                                labelText.textContent = "Comment";

                                replyLabel.appendChild(iconDiv);
                                replyLabel.appendChild(labelText);
                              }

                              const replyError = document.createElement("div");
                              replyError.classList.add("comment-error");
                              replyError.classList.add("hide");
                              replyError.textContent =
                                "You've exceeded amount of tweets to be commented";

                              replyContainer.appendChild(replyLabel);
                              replyContainer.appendChild(replyError);
                            }

                            const replyInputContainer =
                              document.createElement("div");
                            replyInputContainer.classList.add(
                              "comment-wrapper"
                            );
                            {
                              const textEl = document.createElement("textarea");
                              textEl.id = "field-2";
                              textEl.classList.add("twitter-comment-input");
                              textEl.classList.add("w-input");
                              textEl.placeholder = "Your reply";
                              textEl.maxLength = 5000;
                              textEl.name = "field-2";
                              textEl.setAttribute("data-name", "field");

                              const xComment = document.createElement("div");
                              xComment.classList.add("x-comment");
                              xComment.setAttribute(
                                "data-w-id",
                                "7d49dde2-22af-3af3-4d2a-6779b7115ead"
                              );
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.src =
                                  "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62a1c558370c3e8bfb46546a_16x16%20input%20arrow.svg";
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                xComment.appendChild(imgEl);
                              }

                              replyInputContainer.appendChild(textEl);
                              replyInputContainer.appendChild(xComment);
                            }

                            replyContainer.addEventListener(
                              "click",
                              async function () {
                                const $this = $(replyInputContainer);
                                $this.css("display", "flex");
                                $this.addClass("active-comment-wrapper");
                              }
                            );
                            replyInputContainer
                              .querySelector(".x-comment")
                              .addEventListener("click", async function () {
                                const $this = $(replyInputContainer);
                                $this.removeClass("active-comment-wrapper");
                                setTimeout(
                                  () => $this.css("display", "none"),
                                  250
                                );
                              });

                            checkboxesContainer.appendChild(replyContainer);
                            checkboxesContainer.appendChild(
                              replyInputContainer
                            );
                          }

                          const submitBtn = document.createElement("input");
                          submitBtn.classList.add("submit-button");
                          submitBtn.classList.add("w-button");
                          submitBtn.setAttribute("type", "submit");
                          submitBtn.setAttribute("data-wait", "Please wait...");
                          submitBtn.value = "Submit";

                          boxDiv.appendChild(authorDiv);
                          boxDiv.appendChild(postDiv);
                          boxDiv.appendChild(dateDiv);
                          boxDiv.appendChild(checkboxesContainer);
                          boxDiv.appendChild(submitBtn);
                        }

                        formEl.appendChild(boxDiv);
                      }

                      formEl.addEventListener("submit", async function (ev) {
                        ev.preventDefault();
                        ev.stopImmediatePropagation();
                        ev.stopPropagation();

                        try {
                          const textEl = formEl.querySelector("textarea");
                          if (textEl.value) {
                            const response =
                              await apiCall.postReq<ActionResponse>(
                                `/user/reply/${tid}`,
                                {
                                  id: tid,
                                  text: textEl.value,
                                }
                              );
                            if (response.limit_exceeded)
                              handleResponse("commentd", true);
                            rootEl.remove();
                          }
                        } catch (error) {
                          console.error(error);
                        }
                      });

                      formDiv.appendChild(formEl);
                    }

                    rootEl.appendChild(formDiv);
                  }

                  containerElReply.appendChild(rootEl);
                }

                replyLoader.css("display", "none");
              } catch (error) {
                console.error(error);
              }
            });
        } catch (error) {
          console.error(error);
        }
      }

      // fetching tweets to retweet
      {
        try {
          const {
            tweets: tweetsToRetweet,
            limit_exceeded: limit_exceeded_retweet,
          } = await apiCall.getReq<GetTweetsResp>("/user/tweets/retweet");

          const retweetLoader = $(document.getElementById("retweet-preloader"));
          const containerElRetweet = document.getElementById("retweet-swiper");

          if (limit_exceeded_retweet) {
            handleResponse("retweet", true);
          }

          containerElRetweet
            .querySelectorAll(".swiper-slide")
            .forEach((x) => x.remove());

          for (let i = 0; i < tweetsToRetweet.length; i++) {
            const tweet: TodoTweetObj = tweetsToRetweet[i];

            const { id: tid, text, created_at, author_details } = tweet;

            // creating tweet element
            const rootEl = document.createElement("div");
            rootEl.classList.add("swiper-slide");
            {
              const formDiv = document.createElement("div");
              formDiv.classList.add("form-block-twitter");
              formDiv.classList.add("w-form");
              {
                const formEl = document.createElement("form");
                formEl.classList.add("form-twitter");
                {
                  const boxDiv = document.createElement("div");
                  boxDiv.classList.add("form-card");
                  {
                    const authorDiv = document.createElement("div");
                    authorDiv.classList.add("twitter-author");
                    {
                      const profileImg = document.createElement("img");
                      profileImg.classList.add("twitter-author-image");
                      profileImg.loading = "lazy";
                      profileImg.src = author_details.profile_image_url;
                      profileImg.alt = "";

                      const colDiv = document.createElement("div");
                      colDiv.classList.add("column");
                      colDiv.style.width = "100%";
                      {
                        const nameEl = document.createElement("div");
                        nameEl.classList.add("name-text");
                        nameEl.textContent = author_details.name;

                        const handleEl = document.createElement("div");
                        handleEl.classList.add("handle-text");
                        handleEl.textContent = `@${author_details.username}`;

                        colDiv.appendChild(nameEl);
                        colDiv.appendChild(handleEl);
                      }

                      const iconDiv = document.createElement("img");
                      iconDiv.classList.add("twitter-icon-image");
                      iconDiv.sizes = "20px";
                      iconDiv.loading = "lazy";
                      iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                      iconDiv.src =
                        "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                      authorDiv.appendChild(profileImg);
                      authorDiv.appendChild(colDiv);
                      authorDiv.appendChild(iconDiv);
                    }

                    const postDiv = document.createElement("div");
                    postDiv.classList.add("overflow-block");
                    {
                      const postEl = document.createElement("p");
                      postEl.classList.add("post-text");
                      postEl.innerHTML = text;

                      const oneImgDiv = document.createElement("div");
                      oneImgDiv.classList.add("one-scenario-image");
                      oneImgDiv.classList.add("hide");
                      {
                        const imgEl = document.createElement("img");
                        imgEl.classList.add("cover-image");
                        imgEl.loading = "lazy";
                        imgEl.alt = "";

                        oneImgDiv.appendChild(imgEl);
                      }

                      const twoImgDiv = document.createElement("div");
                      twoImgDiv.classList.add("two-scenario-image-wrap");
                      twoImgDiv.classList.add("hide");
                      twoImgDiv.style.display = "none";
                      {
                        const imgDiv1 = document.createElement("div");
                        imgDiv1.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                        imgDiv1.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv1.appendChild(imgEl);
                        }

                        const imgDiv2 = document.createElement("div");
                        imgDiv2.id =
                          "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                        imgDiv2.classList.add("two-scenario-image");
                        {
                          const imgEl = document.createElement("img");
                          imgEl.classList.add("cover-image");
                          imgEl.loading = "lazy";
                          imgEl.alt = "";

                          imgDiv2.appendChild(imgEl);
                        }

                        twoImgDiv.appendChild(imgDiv1);
                        twoImgDiv.appendChild(imgDiv2);
                      }

                      const oneVidDiv = document.createElement("div");
                      oneVidDiv.classList.add("w-video");
                      oneVidDiv.classList.add("w-embed");
                      oneVidDiv.classList.add("one-video");
                      oneVidDiv.classList.add("hide");
                      oneVidDiv.id =
                        "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                      {
                        const videoEl = document.createElement("video");
                        videoEl.autoplay = false;

                        oneVidDiv.appendChild(videoEl);
                      }

                      if (tweet.attachement_urls) {
                        const urls = tweet.attachement_urls;
                        const n = urls.length;
                        if (n === 1) {
                          oneImgDiv.classList.remove("hide");
                          oneImgDiv.querySelector("img").src = urls[0];
                        } else if (n == 2) {
                          twoImgDiv.classList.remove("hide");
                          twoImgDiv
                            .querySelectorAll("img")
                            .forEach((x, i) => (x.src = urls[i]));
                        }
                      }

                      postDiv.appendChild(postEl);
                      postDiv.appendChild(oneImgDiv);
                      postDiv.appendChild(twoImgDiv);
                      postDiv.appendChild(oneVidDiv);
                    }

                    const dateDiv = document.createElement("div");
                    dateDiv.classList.add("date-text");
                    {
                      const timeEl = document.createElement("div");
                      timeEl.classList.add("post-time");
                      timeEl.textContent = created_at.time;

                      const dotEl = document.createElement("div");
                      dotEl.classList.add("span-dot");
                      {
                        const textEl = document.createTextNode(".");
                        dotEl.appendChild(textEl);
                      }

                      const dateEl = document.createElement("div");
                      dateEl.classList.add("post-date");
                      dateEl.textContent = created_at.date;

                      dateDiv.appendChild(timeEl);
                      dateDiv.appendChild(dotEl);
                      dateDiv.appendChild(dateEl);
                    }

                    const checkboxesContainer = document.createElement("div");
                    checkboxesContainer.classList.add("checkboxes-wrapper");
                    {
                      const retweetContainer = document.createElement("div");
                      retweetContainer.classList.add("column");
                      {
                        const retweetError = document.createElement("div");
                        retweetError.classList.add("retweet-error");
                        retweetError.classList.add("hide");
                        retweetError.textContent =
                          "You've exceeded amount of tweets to be retweeted";

                        const retweetLabel = document.createElement("label");
                        retweetLabel.classList.add("w-checkbox");
                        retweetLabel.classList.add("retweet-checkbox");
                        {
                          const iconDiv = document.createElement("div");
                          iconDiv.classList.add("w-checkbox-input");
                          iconDiv.classList.add(
                            "w-checkbox-input--inputType-custom"
                          );
                          iconDiv.classList.add("retweet-checkbox-check");

                          const inputEl = document.createElement("input");
                          inputEl.id = "Retweet-Checkbox-2";
                          inputEl.type = "checkbox";
                          inputEl.setAttribute(
                            "data-name",
                            "Retweet Checkbox 2"
                          );
                          inputEl.style.position = "absolute";
                          inputEl.style.opacity = "0";
                          inputEl.style.zIndex = "-1";
                          {
                            inputEl.addEventListener("change", async () => {
                              if (inputEl.checked) {
                                rootEl.remove();
                                try {
                                  const resp =
                                    await apiCall.getReq<ActionResponse>(
                                      `/user/retweet/${tid}`
                                    );
                                  if (resp.limit_exceeded)
                                    handleResponse("retweet", true);
                                } catch (error) {
                                  console.error(error);
                                }
                              }
                            });
                          }

                          const spanEl = document.createElement("span");
                          spanEl.classList.add("w-form-label");
                          spanEl.classList.add("checkbox-label-card");
                          spanEl.setAttribute("for", "Retweet-Checkbox-2");
                          spanEl.textContent = "Retweet";

                          retweetLabel.appendChild(iconDiv);
                          retweetLabel.appendChild(inputEl);
                          retweetLabel.appendChild(spanEl);

                          retweetContainer.appendChild(retweetLabel);
                          retweetContainer.appendChild(retweetError);
                        }

                        checkboxesContainer.appendChild(retweetContainer);
                      }

                      boxDiv.appendChild(authorDiv);
                      boxDiv.appendChild(postDiv);
                      boxDiv.appendChild(dateDiv);
                      boxDiv.appendChild(checkboxesContainer);
                    }

                    formEl.appendChild(boxDiv);
                  }

                  formDiv.appendChild(formEl);
                }

                rootEl.appendChild(formDiv);
              }

              containerElRetweet.appendChild(rootEl);
            }
          }

          retweetLoader.css("display", "none");

          document
            .querySelector("a.refresh-retweeted")
            .addEventListener("click", async () => {
              try {
                retweetLoader.css("display", "block");
                const randomArray = shuffle(tweetsToRetweet.length);

                const containerElRetweet =
                  document.getElementById("retweet-swiper");

                containerElRetweet
                  .querySelectorAll(".swiper-slide")
                  .forEach((x) => x.remove());

                for (let i = 0; i < tweetsToRetweet.length; i++) {
                  const tweet: TodoTweetObj = tweetsToRetweet[randomArray[i]];

                  const { id: tid, text, created_at, author_details } = tweet;

                  // creating tweet element
                  const rootEl = document.createElement("div");
                  rootEl.classList.add("swiper-slide");
                  {
                    const formDiv = document.createElement("div");
                    formDiv.classList.add("form-block-twitter");
                    formDiv.classList.add("w-form");
                    {
                      const formEl = document.createElement("form");
                      formEl.classList.add("form-twitter");
                      {
                        const boxDiv = document.createElement("div");
                        boxDiv.classList.add("form-card");
                        {
                          const authorDiv = document.createElement("div");
                          authorDiv.classList.add("twitter-author");
                          {
                            const profileImg = document.createElement("img");
                            profileImg.classList.add("twitter-author-image");
                            profileImg.loading = "lazy";
                            profileImg.src = author_details.profile_image_url;
                            profileImg.alt = "";

                            const colDiv = document.createElement("div");
                            colDiv.classList.add("column");
                            colDiv.style.width = "100%";
                            {
                              const nameEl = document.createElement("div");
                              nameEl.classList.add("name-text");
                              nameEl.textContent = author_details.name;

                              const handleEl = document.createElement("div");
                              handleEl.classList.add("handle-text");
                              handleEl.textContent = `@${author_details.username}`;

                              colDiv.appendChild(nameEl);
                              colDiv.appendChild(handleEl);
                            }

                            const iconDiv = document.createElement("img");
                            iconDiv.classList.add("twitter-icon-image");
                            iconDiv.sizes = "20px";
                            iconDiv.loading = "lazy";
                            iconDiv.srcset = `https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-500.png 500w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon-p-800.png 800w, https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png 995w`;
                            iconDiv.src =
                              "https://global-uploads.webflow.com/62a1c558370c3e453e465451/62befb77c2a90e6b17d75ace_Twitter%20Icon.png";

                            authorDiv.appendChild(profileImg);
                            authorDiv.appendChild(colDiv);
                            authorDiv.appendChild(iconDiv);
                          }

                          const postDiv = document.createElement("div");
                          postDiv.classList.add("overflow-block");
                          {
                            const postEl = document.createElement("p");
                            postEl.classList.add("post-text");
                            postEl.innerHTML = text;

                            const oneImgDiv = document.createElement("div");
                            oneImgDiv.classList.add("one-scenario-image");
                            oneImgDiv.classList.add("hide");
                            {
                              const imgEl = document.createElement("img");
                              imgEl.classList.add("cover-image");
                              imgEl.loading = "lazy";
                              imgEl.alt = "";

                              oneImgDiv.appendChild(imgEl);
                            }

                            const twoImgDiv = document.createElement("div");
                            twoImgDiv.classList.add("two-scenario-image-wrap");
                            twoImgDiv.classList.add("hide");
                            twoImgDiv.style.display = "none";
                            {
                              const imgDiv1 = document.createElement("div");
                              imgDiv1.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda4-f41c99d7";
                              imgDiv1.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv1.appendChild(imgEl);
                              }

                              const imgDiv2 = document.createElement("div");
                              imgDiv2.id =
                                "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                              imgDiv2.classList.add("two-scenario-image");
                              {
                                const imgEl = document.createElement("img");
                                imgEl.classList.add("cover-image");
                                imgEl.loading = "lazy";
                                imgEl.alt = "";

                                imgDiv2.appendChild(imgEl);
                              }

                              twoImgDiv.appendChild(imgDiv1);
                              twoImgDiv.appendChild(imgDiv2);
                            }

                            const oneVidDiv = document.createElement("div");
                            oneVidDiv.classList.add("w-video");
                            oneVidDiv.classList.add("w-embed");
                            oneVidDiv.classList.add("one-video");
                            oneVidDiv.classList.add("hide");
                            oneVidDiv.id =
                              "w-node-_01342ca9-9bfc-e451-5fe7-faf764cfcda6-f41c99d7";
                            {
                              const videoEl = document.createElement("video");
                              videoEl.autoplay = false;

                              oneVidDiv.appendChild(videoEl);
                            }

                            if (tweet.attachement_urls) {
                              const urls = tweet.attachement_urls;
                              const n = urls.length;
                              if (n === 1) {
                                oneImgDiv.classList.remove("hide");
                                oneImgDiv.querySelector("img").src = urls[0];
                              } else if (n == 2) {
                                twoImgDiv.classList.remove("hide");
                                twoImgDiv
                                  .querySelectorAll("img")
                                  .forEach((x, i) => (x.src = urls[i]));
                              }
                            }

                            postDiv.appendChild(postEl);
                            postDiv.appendChild(oneImgDiv);
                            postDiv.appendChild(twoImgDiv);
                            postDiv.appendChild(oneVidDiv);
                          }

                          const dateDiv = document.createElement("div");
                          dateDiv.classList.add("date-text");
                          {
                            const timeEl = document.createElement("div");
                            timeEl.classList.add("post-time");
                            timeEl.textContent = created_at.time;

                            const dotEl = document.createElement("div");
                            dotEl.classList.add("span-dot");
                            {
                              const textEl = document.createTextNode(".");
                              dotEl.appendChild(textEl);
                            }

                            const dateEl = document.createElement("div");
                            dateEl.classList.add("post-date");
                            dateEl.textContent = created_at.date;

                            dateDiv.appendChild(timeEl);
                            dateDiv.appendChild(dotEl);
                            dateDiv.appendChild(dateEl);
                          }

                          const checkboxesContainer =
                            document.createElement("div");
                          checkboxesContainer.classList.add(
                            "checkboxes-wrapper"
                          );
                          {
                            const retweetContainer =
                              document.createElement("div");
                            retweetContainer.classList.add("column");
                            {
                              const retweetError =
                                document.createElement("div");
                              retweetError.classList.add("retweet-error");
                              retweetError.classList.add("hide");
                              retweetError.textContent =
                                "You've exceeded amount of tweets to be retweeted";

                              const retweetLabel =
                                document.createElement("label");
                              retweetLabel.classList.add("w-checkbox");
                              retweetLabel.classList.add("retweet-checkbox");
                              {
                                const iconDiv = document.createElement("div");
                                iconDiv.classList.add("w-checkbox-input");
                                iconDiv.classList.add(
                                  "w-checkbox-input--inputType-custom"
                                );
                                iconDiv.classList.add("retweet-checkbox-check");

                                const inputEl = document.createElement("input");
                                inputEl.id = "Retweet-Checkbox-2";
                                inputEl.type = "checkbox";
                                inputEl.setAttribute(
                                  "data-name",
                                  "Retweet Checkbox 2"
                                );
                                inputEl.style.position = "absolute";
                                inputEl.style.opacity = "0";
                                inputEl.style.zIndex = "-1";
                                {
                                  inputEl.addEventListener(
                                    "change",
                                    async () => {
                                      if (inputEl.checked) {
                                        try {
                                          const resp =
                                            await apiCall.getReq<ActionResponse>(
                                              `/user/retweet/${tid}`
                                            );
                                          if (resp.limit_exceeded)
                                            handleResponse("retweet", true);
                                          rootEl.remove();
                                        } catch (error) {
                                          console.error(error);
                                        }
                                      }
                                    }
                                  );
                                }

                                const spanEl = document.createElement("span");
                                spanEl.classList.add("w-form-label");
                                spanEl.classList.add("checkbox-label-card");
                                spanEl.setAttribute(
                                  "for",
                                  "Retweet-Checkbox-2"
                                );
                                spanEl.textContent = "Retweet";

                                retweetLabel.appendChild(iconDiv);
                                retweetLabel.appendChild(inputEl);
                                retweetLabel.appendChild(spanEl);

                                retweetContainer.appendChild(retweetLabel);
                                retweetContainer.appendChild(retweetError);
                              }

                              checkboxesContainer.appendChild(retweetContainer);
                            }

                            boxDiv.appendChild(authorDiv);
                            boxDiv.appendChild(postDiv);
                            boxDiv.appendChild(dateDiv);
                            boxDiv.appendChild(checkboxesContainer);
                          }

                          formEl.appendChild(boxDiv);
                        }

                        formDiv.appendChild(formEl);
                      }

                      rootEl.appendChild(formDiv);
                    }

                    containerElRetweet.appendChild(rootEl);
                  }
                }

                retweetLoader.css("display", "none");
              } catch (error) {
                console.error(error);
              }
            });
        } catch (error) {
          console.error(error);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
});
