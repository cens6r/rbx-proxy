FROM node:lts-alpine

ENV LOG_STARTUP_INFO=true
ENV HATE_LAN_ACCESS=true
ENV MFDLABS_ARC_SERVER=
ENV ALLOWED_IPV4_CIDRS=127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
ENV ALLOWED_IPV6_CIDRS=fd00::/8,fe80::/10,ff00::/8,2001:db8::/32,fc00::/7,::1/128
ENV LOG_PERSIST=false
ENV ABORT_CONNECTION_IF_INVALID_IP=true
ENV GA4_MEASUREMENT_ID=
ENV GA4_API_SECRET=
ENV GA4_ENABLE_LOGGING=false
ENV GA4_ENABLE_VALIDATION=true
ENV GA4_DISABLE_IP_LOGGING=false
ENV ENABLE_GA4_CLIENT=false
ENV DISABLE_IPV6=true

# make the 'app' folder the current working directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package*.json ./

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY . .

# build app for production
RUN npm run build-full

EXPOSE 80 443
CMD [ "npm", "start" ]