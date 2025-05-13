# fragments

## npm run lint


Check formatting/code style using ESLint.  

Points out problems

---

## node src/server.js


Start application manually. 

Runs the server without any logging or file watching.

---

## npm start


Same as `node src/server.js`. 

Standard way to run the server.

---

## npm run dev


Starts the server in development mode.  

Uses `nodemon` to auto-restart on changes.  

On Windows, it is important to install `cross-env`:


---

## npm run debug


Starts the server with debugging enabled.  

Useful for inspecting with tools like Chrome DevTools.

Also uses `nodemon` to reload on file changes.


