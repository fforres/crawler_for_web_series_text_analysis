docker build -t postgres .
docker run --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -d .
