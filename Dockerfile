# syntax=docker/dockerfile:1

########## Stage 1: deps (install production dependencies only)
FROM node:20.19.4 AS deps

WORKDIR /app

# Quieter npm output and no colors in non-TTY builds
ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

# Only copy manifests so this layer is cached unless deps change
COPY package*.json ./

# Install reproducibly; omit dev deps for a lean runtime
RUN npm ci --omit=dev


########## Stage 2: runtime
FROM node:20.19.4-alpine AS runtime

LABEL maintainer="Aditi Sharma <aditi21604@gmail.com>" \
      description="Fragments node.js microservice"

# Service port (remember: EXPOSE is just documentation)
ENV PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

# Bring in production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Your app code + package metadata (so npm start works)
COPY package*.json ./
COPY ./src ./src

# If you need Basic Auth inside the container for testing,
# either mount your .htpasswd file at runtime:
#   -v "$(pwd)/tests/.htpasswd:/app/tests/.htpasswd:ro"
# or uncomment the next line to bake it in (not recommended for prod):
# COPY ./tests/.htpasswd ./tests/.htpasswd

EXPOSE 8080

# JSON form prevents signal handling issues
CMD ["npm", "start"]
