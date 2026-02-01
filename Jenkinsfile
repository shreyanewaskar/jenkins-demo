pipeline {
    agent any

    environment {
        IMAGE_NAME = "shreyanewaskar27/vartaverse-v1"
        IMAGE_TAG = "latest"
    }

    stages {

        stage('Push Docker Image') {
            steps {
                script {
                    echo "Pushing existing Docker image to Docker Hub..."
                    def image = docker.image("${IMAGE_NAME}:${IMAGE_TAG}")
                    docker.withRegistry('https://index.docker.io/v1/', 'shreyanewaskar27') {
                        image.push()
                    }
                }
            }
        }
    }

    post {
        success { echo "Docker image successfully pushed 🚀" }
        failure { echo "Pipeline failed ❌" }
    }
}
