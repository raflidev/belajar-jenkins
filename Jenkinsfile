pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME    = 'belajar-jenkins-app'
        CONTAINER_NAME = 'belajar-jenkins-app'
        APP_PORT      = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh "docker build --target test -t ${IMAGE_NAME}:test ."
            }
        }

        stage('Build Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    docker rm -f ${CONTAINER_NAME} || true
                    docker run -d --name ${CONTAINER_NAME} -p ${APP_PORT}:3000 ${IMAGE_NAME}:latest
                """
            }
        }

        stage('Smoke Test') {
            steps {
                sh "sleep 2 && docker exec ${CONTAINER_NAME} wget -qO- http://localhost:3000/health"
            }
        }
    }

    post {
        success {
            echo "Deploy sukses -> http://localhost:${APP_PORT} (build #${BUILD_NUMBER})"
        }
        failure {
            echo 'Build gagal, cek console output di atas.'
        }
    }
}
