# ===== BUILD STAGE =====
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /build

COPY euraka_example ./EurekaServer
COPY UserService/UserService ./UserService
COPY ContentService/ContentService ./ContentService

RUN mvn -f EurekaServer/pom.xml clean package -DskipTests
RUN mvn -f UserService/pom.xml clean package -DskipTests
RUN mvn -f ContentService/pom.xml clean package -DskipTests

# ===== RUNTIME STAGE =====
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /build/EurekaServer/target/*.jar ./eureka.jar
COPY --from=builder /build/UserService/target/*.jar ./user.jar
COPY --from=builder /build/ContentService/target/*.jar ./content.jar

EXPOSE 8761 8083 8082

CMD sh -c "java -jar eureka.jar & java -jar user.jar & java -jar content.jar & wait"
