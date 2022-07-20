type Member = {
  id: string;
  loggedIn: boolean;
};
interface IMemberStack {
  onReady: Promise<Member>;
  logout(): void;
}
type TokenObj = {
  access_token: string;
  refresh_token: string;
};

var MemberStack: IMemberStack =
  (window.MemberStack as IMemberStack) || ({} as IMemberStack);

{
  fetch("https://api.tweetnest.io/api/").then((res) =>
    res.text().then(console.log).catch(console.error)
  );
}

window.addEventListener("load", () => {
  const tokenObj: TokenObj | null = JSON.parse(
    localStorage.getItem("token") || "null"
  );

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

  const dashboardBtn = document.getElementById("dashboard-id");
  if (dashboardBtn) {
    dashboardBtn.setAttribute("href", "#");
    dashboardBtn.addEventListener("click", async () => {
      try {
        // getting member
        const member = await window.MemberStack.onReady;

        // checking if member is logged in
        if (member.loggedIn) {
          // checking if token exists
          if (tokenObj)
            window.location.href = `https://tweetnest.io/member/${member.id}`;
          else {
            // getting auth url
            const req = await fetch(
              "https://api.tweetnest.io/api/auth/authorize"
            );

            type AuthUrlResponse = {
              status: boolean;
              message?: string;
              data?: string;
            };
            const resp = (await req.json()) as AuthUrlResponse;
            if (resp.status) {
              window.location.href = resp.data;
            } else {
              throw new Error(resp.message);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
});
