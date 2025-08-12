

import mongoose from 'mongoose';
import { logger } from '../logger.js';
import { decryptData, encryptData } from '../util/Data_protection.js';


const key = process.env.KEY;

// Login function
export const AdminLogin = async (req, res) => { 


    const decrpteddata = decryptData(req.body , key);

    const { client_id, admin_id, password } = decrpteddata;

    // Validate required fields
    if (!client_id || !admin_id || !password) {
        logger.error('Required fields are missing');
        return res.status(400).json({
            message: 'Required fields are missing',
        });
    }

    try {
        // Access the main database (classesmanagementsystem)
        const mainDb = mongoose.connection;

      
       
        // Query the clients collection to find the client
        const client = await mainDb.collection('clients').findOne({ client_id : parseInt(client_id) });

      

        if (!client) {
            logger.error(`Client not found: ${client_id}`);
            return res.status(404).json({
                message: 'Client not found',
            });
        }

        // Assuming the client document has a dbName field
        const clientDbName = client.dbname;
        if (!clientDbName) {
            logger.error(`No database specified for client: ${client_id}`);
            return res.status(400).json({
                message: 'No database specified for client',
            });
        }

        

        // Switch to the client-specific database
        const clientDb = mainDb.useDb(clientDbName, { useCache: true });
        

        // Example: Query the admins collection in the client-specific database
        const admin = await clientDb.collection('admin').findOne({
           admin_id  : admin_id
        });

       
        if (!admin) {
            logger.error(`Invalid admin credentials for client: ${client_id}`);
            return res.status(404).json({
                message: 'Invalid adminID credentials',
            });
        }

       
    

        if(decryptData(admin.password,process.env.KEY) != password){
            return res.status(401).json({
                message : "Incorrect Password"
            })
           
        }

        
        const encrytedrank = encryptData( admin.rank , process.env.KEY);

        const encryteddbname = encryptData(client.dbname , process.env.KEY);

        
        return res.status(200).json({
            message: 'Login successful',
            payload: {
                rank : encrytedrank,
                db : encryteddbname,
                admin_id : admin_id
            },
        });

    } catch (error) {
        logger.error(`Login failed: ${error.message}`);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message,
        });
    }
};



