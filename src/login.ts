window.addEventListener("load", () => {
  const formEl = document.getElementById("wf-form-Log-in-form");

  formEl.addEventListener("submit", () => {
    const interval = setInterval(async () => {
      try {
        // getting member
        const member = await window.MemberStack.onReady;

        // checking if member is logged in
        if (member.loggedIn) {
          // getting auth url
          const req = await fetch(
            "https://tweetnet-backend.herokuapp.com/api/auth/authorize"
          );

          type AuthUrlResponse = {
            status: boolean;
            message?: string;
            data?: string;
          };
          const resp = (await req.json()) as AuthUrlResponse;
          if (resp.status) {
            clearInterval(interval);
            window.location.href = resp.data;
          } else {
            throw new Error(resp.message);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }, 1000);
  });
});
