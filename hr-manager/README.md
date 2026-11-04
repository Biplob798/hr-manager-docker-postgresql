# HR Manager

React (Vite) + Node.js/Express + PostgreSQL 16, deployed with Docker Compose.
PostgreSQL runs on the Linux host (not in Docker). Database `hrdb`, user `hr`.

```
hr-manager/
├── docker-compose.yml
├── .env.example        # copy to .env on the server
├── .gitignore
├── .gitattributes
├── db/init-hr.sql      # optional tables + demo data
├── backend/            # Express API (port 3000, internal)
└── frontend/           # React app, served by nginx on port 80
```

## Deploy on the Linux server

```bash
cd /u01/app
git clone https://github.com/<your-user>/hr-manager.git
cd hr-manager
cp .env.example .env
nano .env                 # set DB_PASSWORD
chmod 600 .env
docker compose up -d --build
```

Open `http://<server-ip>/`.

## Update after a change

```bash
cd /u01/app/hr-manager
git pull
docker compose up -d --build
```

## Useful commands

```bash
docker compose ps
docker compose logs -f backend
docker compose down
curl http://localhost/api/health
```

## Host PostgreSQL must accept the containers (one time)

1. `/var/lib/pgsql/16/data/postgresql.conf` -> `listen_addresses = '*'`
2. `/var/lib/pgsql/16/data/pg_hba.conf` -> add: `host  hrdb  hr  172.16.0.0/12  scram-sha-256`
3. `sudo firewall-cmd --permanent --zone=docker --add-port=5432/tcp && sudo firewall-cmd --reload`
4. `sudo systemctl restart postgresql-16 && sudo systemctl restart docker`

## Local development (Windows)

```
cd backend  && npm install && set DB_HOST=... && npm start
cd frontend && npm install && npm run dev
```
###############################################
Step 6: Install fresh PostgreSql 16

Step 3: Install the PostgreSQL repository
dnf --disablerepo=local install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm


dnf --disablerepo=local -qy module disable postgresql


Step 4: Install PostgreSQL 16

dnf --disablerepo=local install -y postgresql16-server postgresql16

Step 2: Initialize the database

/usr/pgsql-16/bin/postgresql-16-setup initdb

Step 3: Start it and enable it at boot

systemctl enable --now postgresql-16

systemctl status postgresql-16 --no-pager



========================


Software (programs)	/usr/pgsql-16/

==========================


Database files (your data)	/var/lib/pgsql/16/data

========================


Main config file	/var/lib/pgsql/16/data/postgresql.conf


=========================


Access rules	/var/lib/pgsql/16/data/pg_hba.conf


===========================


Logs	/var/lib/pgsql/16/data/log/

=============================

Service file	/usr/lib/systemd/system/postgresql-16.service

=======================================

Port	5432

=========================


for connect postgreSql Database 

==========================

cd /tmp
sudo -u postgres psql

The prompt changes to postgres=#. Type \q to leave.


==================================


Step 1: Create the user


CREATE USER hr WITH PASSWORD 'hr';

CREATE USER hr WITH PASSWORD 'hr';

===========================

Step 1: Create a database owned by hr (as root)


CREATE DATABASE hrdb OWNER hr;

============================
want to see all user or role on my posgersql database have
=======================
Way 1: The short command \du 

\du
========================

cd /tmp
sudo -u postgres psql -c "\du"

======================================

The name before the = or - is the database. The last character shows the role type: # means a superuser, and > means a normal user. 
Yours shows postgres-#, so you are still the admin. To check for certain, type SELECT current_user; and read the answer.

=============================================
connect hr user
=================================================


\q

3. Log in as hr:

PGPASSWORD='hr' psql -h 127.0.0.1 -U hr -d hrdb

SELECT current_user, current_database();



====================

now create table 

===================

CREATE TABLE departments (
  department_id   SERIAL PRIMARY KEY,
  department_name VARCHAR(50) NOT NULL
);

SELECT * FROM departments;
\dt




INSERT INTO departments (department_name) VALUES
  ('Administration'),
  ('IT'),
  ('Sales');





CREATE TABLE employees (
  employee_id   SERIAL PRIMARY KEY,
  first_name    VARCHAR(30),
  last_name     VARCHAR(30) NOT NULL,
  email         VARCHAR(50) NOT NULL UNIQUE,
  phone_number  VARCHAR(20),
  hire_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  job_title     VARCHAR(50),
  salary        NUMERIC(10,2) CHECK (salary >= 0),
  department_id INTEGER REFERENCES departments(department_id)
);



INSERT INTO employees (first_name, last_name, email, phone_number, hire_date, job_title, salary, department_id) VALUES
  ('Steven',    'King',    'SKING@example.com',    '515.123.4567', '2020-06-17', 'President',        24000, 1),
  ('Neena',     'Kochhar', 'NKOCHHAR@example.com', '515.123.4568', '2021-09-21', 'Sales Manager',    17000, 3),
  ('Alexander', 'Hunold',  'AHUNOLD@example.com',  '590.423.4567', '2022-01-03', 'IT Programmer',     9000, 2),
  ('Bruce',     'Ernst',   'BERNST@example.com',   '590.423.4568', '2022-05-21', 'IT Programmer',     6000, 2),
  ('Diana',     'Lorentz', 'DLORENTZ@example.com', '590.423.5567', '2023-02-07', 'IT Support',        4200, 2),
  ('Susan',     'Mavris',  'SMAVRIS@example.com',  '515.123.7777', '2023-06-07', 'HR Representative', 6500, 1);



select * from employees;
=============================================


On the RHEL server (as root): let your PC connect

=====================================


echo "listen_addresses = '*'" >> /var/lib/pgsql/16/data/postgresql.conf

echo "host  hrdb  hr  192.168.0.0/24  scram-sha-256" >> /var/lib/pgsql/16/data/pg_hba.conf

firewall-cmd --permanent --add-port=5432/tcp
firewall-cmd --reload

systemctl restart postgresql-16
ss -tlnp | grep 5432

docker run --rm -e PGPASSWORD=hr postgres:16-alpine psql -h 192.168.0.155 -U hr -d hrdb -c "select count(*) from employees;"

===============================================
Add-Content "C:\Program Files\PostgreSQL\16\data\postgresql.conf" "listen_addresses = '*'"
Add-Content "C:\Program Files\PostgreSQL\16\data\pg_hba.conf" "host  hrdb  hr  192.168.0.0/24  scram-sha-256"
New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
Get-Service *postgres*
Restart-Service postgresql-x64-16
=============================

Test from your app machine
--------------------------------------------
docker run --rm -e PGPASSWORD=hr postgres:16-alpine psql -h <WINDOWS_DB_IP> -U hr -d hrdb -c "select count(*) from employees;"
===============================================

On Windows: point the app at the server
=======================================

.env in the folder with docker-compose.yml

=========================================

DB_HOST=192.168.0.201
DB_PORT=5432
DB_USER=hr
DB_PASSWORD=hr
DB_NAME=hrdb



=========================================

Test the connection from Windows

===========================================


docker run --rm -e PGPASSWORD=hr postgres:16-alpine psql -h 192.168.0.201 -U hr -d hrdb -c "select count(*) from employees;"


==================================================

Start the app

==================================
docker compose up -d --build 
docker compose up -d --force-recreate
docker compose logs backend







 cd /localdvd
 mount -o loop /localdvd/rhel-8.9-x86_64-dvd.iso /localdvd
################################################



for linux machine deploy

########################################

mkdir /u01/app
cd /u01/app
git clone https://github.com/Biplob798/hr-manager-docker-postgresql.git
cd hr-manager-docker-postgresql/hr-manager
ls

cp .env.example .env
nano .env

docker compose up -d --build

docker compose up -d --build     # build and start
docker compose down              # stop
docker compose logs -f backend   # backend logs
docker compose ps                # container status



cd hr-manager
dir docker-compose.yml
docker compose build
docker compose push

docker login
docker compose pull
docker compose up -d


https://hub.docker.com/r/biplob798/hr-backend
https://hub.docker.com/r/biplob798/hr-frontend