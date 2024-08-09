import sys
import os
import platform
import json
import boto3
from botocore.exceptions import ClientError

if platform.system() == "Windows":
        os.system("cls")
elif platform.system() == "Linux" or platform.system() == "Darwin":
    os.system("clear")

if os.path.exists("./.initialSetupDone.txt"):
    if len(sys.argv) > 1:
        if sys.argv[1].lower() == "add":
            if not len(sys.argv) > 2:
                acronym = input("Enter the acronym of the school you want to add (MIS, ZIS, etc.): ")
            else:
                acronym = sys.argv[2]
            logoPath = input("Enter the absolute path to the logo of the school you want to add: ")

            if not os.path.exists(logoPath):
                print("Invalid path to logo. Fix and try again.")
                sys.exit(0)
            else:
                os.system(f"cp {logoPath} ./CommonUse/{acronym}_Logo-200x200.png")

            try:
                if not os.path.exists("./.streamData.js"):
                    print("streamData.js not found. Please fix and run again.")
                    sys.exit(0)
                with open('./.streamData.js') as dataFile:
                        data = dataFile.read()
                        obj = data[data.find('{') : data.rfind('}')+1]
                        jsonObj = json.loads(obj)
                if 'dbName' not in jsonObj.keys() or 'accessKey' not in jsonObj.keys() or 'secretKey' not in jsonObj.keys() or 'awsRegion' not in jsonObj.keys():
                    print("Missing data in streamData.js file. Fix and try again.")
                    sys.exit(0)
            except json.decoder.JSONDecodeError:
                print("Invalid JSON data in streamData.js file. Fix and try again.")
                sys.exit(0)

            wantedDB = input("Enter the names of the database you want to add the school to (Comma separated): ")
            if not wantedDB:
                print("Invalid database name. Fix and try again.")
                sys.exit(0)
            else:
                database_names = [db.strip() for db in wantedDB.split(",")]
                aws_access_key = jsonObj['accessKey']
                aws_secret_key = jsonObj['secretKey']
                wantedDB = wantedDB.split(",")
                dynamodb = boto3.resource(
                    'dynamodb', 
                    region_name=jsonObj['awsRegion'], 
                    aws_access_key_id=aws_access_key, 
                    aws_secret_access_key=aws_secret_key
                )

                # Replace this with the primary key and attributes of the item you want to add
                items_data = [
                    {
                        'valueId': 'primaryColors',
                        acronym.lower(): '#000000',
                    },
                    {
                        'valueId': 'secondaryColors',
                        acronym.lower(): '#000000',
                    },
                ]

                for db_name in database_names:
                    try:
                        table = dynamodb.Table(db_name)
                        # Update primaryColors
                        response = table.update_item(
                            Key={'valueId': 'primaryColors'},
                            UpdateExpression='SET #ac = :val',
                            ExpressionAttributeNames={'#ac': acronym.lower()},
                            ExpressionAttributeValues={':val': '#000000'},
                            ReturnValues='UPDATED_NEW'
                        )
                        print(f"Added primary color header to database {db_name} for school {acronym}")

                        # Update secondaryColors
                        response = table.update_item(
                            Key={'valueId': 'secondaryColors'},
                            UpdateExpression='SET #ac = :val',
                            ExpressionAttributeNames={'#ac': acronym.lower()},
                            ExpressionAttributeValues={':val': '#000000'},  # Change to desired secondary color
                            ReturnValues='UPDATED_NEW'
                        )
                        print(f"Added secondary color header for database {db_name} for school {acronym}")

                    except ClientError as e:
                        print(f"An error occurred with {db_name}: ", e.response['Error']['Message'])


                        
        elif sys.argv[1].lower() == 'remove':
            deleteLogo = input("Do you want to delete the logo of the school you want to remove? (y/n): ").lower()



            if not len(sys.argv) > 2:
                acronym = input("Enter the acronym of the school you want to remove (MIS, ZIS, etc.): ")
            else:
                acronym = sys.argv[2]
            try:
                if not os.path.exists("./.streamData.js"):
                    print("streamData.js not found. Please fix and run again.")
                    sys.exit(0)
                with open('./.streamData.js') as dataFile:
                        data = dataFile.read()
                        obj = data[data.find('{') : data.rfind('}')+1]
                        jsonObj = json.loads(obj)
                if 'dbName' not in jsonObj.keys() or 'accessKey' not in jsonObj.keys() or 'secretKey' not in jsonObj.keys() or 'awsRegion' not in jsonObj.keys():
                    print("Missing data in streamData.js file. Fix and try again.")
                    sys.exit(0)
            except json.decoder.JSONDecodeError:
                print("Invalid JSON data in streamData.js file. Fix and try again.")
                sys.exit(0)

            wantedDB = input("Enter the names of the database you want to remove the school from (Comma separated): ")
            if not wantedDB:
                print("Invalid database name. Fix and try again.")
                sys.exit(0)
            else:
                if deleteLogo == 'y':
                    os.system(f"rm ./CommonUse/{acronym}_Logo-200x200.png")
                

                database_names = [db.strip() for db in wantedDB.split(",")]
                aws_access_key = jsonObj['accessKey']
                aws_secret_key = jsonObj['secretKey']
                wantedDB = wantedDB.split(",")
                dynamodb = boto3.resource(
                    'dynamodb', 
                    region_name=jsonObj['awsRegion'], 
                    aws_access_key_id=aws_access_key, 
                    aws_secret_access_key=aws_secret_key
                )

                # Replace this with the primary key and attributes of the item you want to add
                items_data = [
                    {
                        'valueId': 'primaryColors',
                        acronym.lower(): '#000000',
                    },
                    {
                        'valueId': 'secondaryColors',
                        acronym.lower(): '#000000',
                    },
                ]

                for db_name in database_names:
                    try:
                        table = dynamodb.Table(db_name)
                        # Update primaryColors
                        response = table.update_item(
                            Key={'valueId': 'primaryColors'},
                            UpdateExpression='REMOVE #ac',
                            ExpressionAttributeNames={'#ac': acronym.lower()},
                            ReturnValues='UPDATED_NEW'
                        )
                        print(f"Removed primary color header to database {db_name} for school {acronym}")

                        # Update secondaryColors
                        response = table.update_item(
                            Key={'valueId': 'secondaryColors'},
                            UpdateExpression='REMOVE #ac',
                            ExpressionAttributeNames={'#ac': acronym.lower()},
                            ReturnValues='UPDATED_NEW'
                        )
                        print(f"Removed secondary color header for database {db_name} for school {acronym}")
                    except ClientError as e:
                        print(f"An error occurred with {db_name}: ", e.response['Error']['Message'])
                    
        else:
            print("Invalid argument. Please specify \'add\' or \'remove\'.")
            sys.exit(0)
    else:
        print("Invalid argument. Please specify \'add\' or \'remove\'.")
        sys.exit(0)
else:
    print("Please complete initial setup first.")
    sys.exit(0)