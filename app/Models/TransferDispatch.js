'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const Db = use('Database')
const Env = use('Env')
const BRANCH_CODE = Env.get('BRANCH_CODE', '')
const CustomException = use('App/Exceptions/CustomException')
const PosMod      = use('App/Models/Pos')
const TRANS_TYPE  = 16

const moment = require('moment')
const leftPad = require('left-pad')
const roundPrecision = require('round-precision')
const TO_DATE = Env.get('TO_DATE')
const PAGE_LIMIT = Env.get('PAGE_LIMIT', 10)

class TransferDispatch extends Model {

    /**
     * @param {int} page 
     * @param {int} transfer_no 
     */
    async fetch_dispatch_transfer(page, transfer_no) {
        let row = await Db.connection('transfers')
                          .select('a.id', 'a.delivery_date', 'b.name')
                          .joinRaw('FROM 0_transfer_header a INNER JOIN 0_branches b ON a.br_code_in = b.code')
                          .where('br_code_out', BRANCH_CODE)
                          .andWhere('aria_trans_no_out', 0)
                          .andWhere('aria_type_out', 0)
                          .andWhere('cancelled', 0)
                          .whereNotNull('br_code_in')
                          .whereRaw(`a.id LIKE ?`, [(transfer_no == null) ? '' :  `%${transfer_no}%`])
                          .orderBy('a.delivery_date', 'desc')
                          .paginate(page, PAGE_LIMIT)
        return [row.data, row.lastPage]
    }

    /**
     * @param {int} p_transfer_no 
     */
    async fetch_dispatch_transfer_details(p_transfer_no) {
        let row = await Db.connection('transfers')
                          .select('a.delivery_date', 'a.date_created', 'a.requested_by', 'b.name as br_code_out', 'c.name as br_code_in')
                          .joinRaw('FROM 0_transfer_header a INNER JOIN 0_branches b ON a.br_code_out = b.code INNER JOIN 0_branches c ON a.br_code_in = c.code')
                          .where('a.id', p_transfer_no)
        return row[0]
    }
    /**
     * @param {int} p_transfer_no 
     */
    async fetch_dispatch_transfer_details_temp(p_transfer_no) {
        let row = await Db.connection('transfers')
                          .select('*')
                          .from('0_transfer_details')
                          .where('transfer_id', p_transfer_no)
        return row
    }
    /**
     * @param {int} p_transfer_no 
     */
    async fetch_transfer_header(p_transfer_no){
        let row = await Db.connection('transfers')
                          .select('*', 'b.name as br_code_out', 'c.name as br_code_in', 'c.code as branch_in')
                          .joinRaw('FROM 0_transfer_header a INNER JOIN 0_branches b ON a.br_code_out = b.code INNER JOIN 0_branches c ON a.br_code_in = c.code')
                          .where('a.br_code_out', BRANCH_CODE)
                          .andWhere('a.id', p_transfer_no)
                          .andWhere('cancelled', 0)
        return (row.length == 0) ? 0 : row[0]
    }
    /**
     * @param {int} p_transfer_no 
    */
    async fetch_dispatch_header(p_transfer_no) {
        let row = await Db.connection()
                          .select('*')
                          .from('0_dispatch_transfer')
                          .where('posted', 0)
                          .andWhere('transfer_id', p_transfer_no)
        return (row.length == 0) ? 0 : row[0]
    }
    async checkProductId(productid, transfer_no) {
        let row = await Db.connection('transfers')
                          .joinRaw('FROM 0_transfer_header a INNER JOIN 0_transfer_details b ON a.id = b.transfer_id')
                          .where('b.transfer_id', transfer_no)
                          .andWhere('b.stock_id', productid)
        return (row.length > 0) ? true : false
    }
    /**
     * @param {int} productid 
     * @param {int} p_transfer_no 
     * @param {int} qty 
     */
    async qty_dispatch(productid, p_transfer_no, qty) {
        let row = await Db.joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('transfer_id', p_transfer_no)
                          .andWhere('b.prod_id', productid)
                          .sum('qty as total')
        return (row[0].total == null) ? 0  + parseFloat(qty) : parseFloat(row[0].total) + parseFloat(qty) 
    }

    
    /**
     * @param {int} p_transfer_no 
     * @param {int} productid 
     */
    async qty_dispatch_item(p_transfer_no, productid){
        let row = await Db.connection('transfers')
                          .from('0_transfer_details')
                          .where('transfer_id', p_transfer_no)
                          .andWhere('stock_id', productid)
                          .sum('qty_out as total')
        return (row[0].total == null) ? 0 : parseFloat(row[0].total)
    }
    /**
     * 
     * @param {int} transfer_no 
     * @param {string} location_from 
     * @param {int} user_id 
     */
    async add_dispatch_transfer_header(trx, transfer_no, location_to, user_id) {
        let data   = {
            transfer_id: transfer_no,
            location_to: location_to,
            date_: moment().format(TO_DATE),
            user_id: user_id
        }
        let result = await trx.insert(data)
                              .into('0_dispatch_transfer')
        return result[0]
    }
    /**
     * @param {int} productid 
     * @param {int} barcode 
     * @param {int} temp_id 
     */
    async fetch_dispatch_transfer_items(productid, barcode, temp_id){
        let row = await Db.from('0_dispatch_transfer_details')
                          .where('temp_receiving_id', temp_id)
                          .andWhere('barcode', barcode)
                          .andWhere('prod_id', productid)
        return (row.length == 0) ? 0 : row[0]
    }
    /**
     * @param {object} trx 
     * @param {int} temp_id 
     * @param {int} productid 
     * @param {int} barcode 
     * @param {string} description 
     * @param {string} uom 
     * @param {float} qty 
     * @param {int} current_inv 
     */
    async add_dispatch_transfer_details(trx, temp_id, productid, barcode, description, uom, qty, current_inv){
        let data   = {
            temp_receiving_id: temp_id,
            prod_id: productid,
            barcode: barcode,
            item_name: description,
            uom: uom,
            qty: qty,
            current_inventory: current_inv
        }
        await trx.insert(data)
                 .into('0_dispatch_transfer_details')       
    }
    /**
     * @param {int} temp_id 
     * @param {int} productid 
     * @param {int} barcode 
     * @param {int} qty 
     */
    async update_dispatch_transfer_details(trx, temp_id, productid, barcode, qty) {
        await trx.table('0_dispatch_transfer_details')
                 .where('temp_receiving_id', temp_id)
                 .andWhere('prod_id', productid)
                 .andWhere('barcode', barcode)
                 .update({ qty }) 
    }

    /**
     * @param {object} pos_product 
     * @param {int} barcode 
     * @param {int} qty 
     * @param {string} location_from 
     * @param {int} transfer_no 
     * @param {int} user_id 
     * @param {string} current_inv 
     * @param {int} temp_id 
     */
    async add_dispatch_transfer(pos_product, barcode, qty, location_to, transfer_no, user_id, current_inv, temp_id) {
        let trx = await Db.connection().beginTransaction()
        
        let productid   = pos_product[0].productid
        let description = pos_product[0].description
        let uom         = pos_product[0].uom
        if (temp_id == "") {
            temp_id = await this.add_dispatch_transfer_header(trx, transfer_no, location_to, user_id)
        }

        let dispatch_transfer_items = await this.fetch_dispatch_transfer_items(productid, barcode, temp_id)
        if (dispatch_transfer_items == 0) {
            await this.add_dispatch_transfer_details(trx, temp_id, productid, barcode, description, uom, qty, current_inv)
        } else {
            qty = parseFloat(dispatch_transfer_items.qty) + parseFloat(qty)
            await this.update_dispatch_transfer_details(trx, temp_id, productid, barcode, qty)
        }
        
        trx.commit()
        //updating cost of sales gulay
        let gulay = await PosMod.fetch_products(null, productid) 
        if(gulay != "") {
          if(gulay.levelfield1code == '9092' && gulay.levelfield2code == '0006'){
            console.log(gulay.costofsales)
            await  Db.connection('transfers')
            .table('0_transfer_details')
            .where('stock_id', productid)
            .andWhere('transfer_id', transfer_no)
            .update({ cost: gulay.costofsales }) 
          }
        }

        await this.update_last_item_scanned(barcode, productid, temp_id)
        return temp_id
    }

    async update_last_item_scanned(barcode, prod_id, temp_receiving_id) {
        await Db.connection('receiving_new')
                .table('0_dispatch_transfer_details')
                .andWhere('temp_receiving_id', temp_receiving_id)
                .update({ status: 0 })

        await Db.connection('receiving_new')
                .table('0_dispatch_transfer_details')
                .where('barcode', barcode)
                .andWhere('prod_id', prod_id)
                .andWhere('temp_receiving_id', temp_receiving_id)
                .update({ status: 1 })
    }

    async fetch_last_item_scanned(temp_receiving_id) {
        let row = await Db.connection('receiving_new')
                          .select('item_name', 'qty', 'uom', 'prod_id')
                          .from('0_dispatch_transfer_details')
                          .where('temp_receiving_id', temp_receiving_id)
                          .andWhere('status', 1)
       return (row.length == 0) ? 0 : row[0]
    }

    /**
     * sum lahat ng quantity na receive na sa dispatch details na item
     * @param {int} temp_id 
     */
    async sum_dispatch_total_qty_receive(temp_id) {
        let row = await Db.joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('a.posted', 1)
                          .andWhere('a.id', temp_id)
                          .sum('qty as qty')
        return (row[0].qty == null) ? 0 : row[0].qty
    }
    /**
     * @param {int} transfer_id 
     */
    async sum_total_qty_dispatch(transfer_id) {
        let row = await Db.connection('transfers')
                          .from('0_transfer_details')
                          .andWhere('transfer_id', transfer_id)
                          .sum('qty_out as qty')
        return (row[0].qty == null) ? 0 : row[0].qty
    }
    /**
     * @param {int} temp_id 
    */
    async fetch_temporary_items_dispatch(temp_id) {
        let row = await Db.connection()
                          .from('0_dispatch_transfer_details')
                          .where('temp_receiving_id', temp_id)
                          .orderBy('id', 'ASC')
        return row
    }
    /**
     * count lahat ng item ng dispatch na hindi pa posted temp_id
     * @param {string} temp_id  
    */
    async count_total_sku_dispatch(temp_id) {
        let row = await Db.joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('a.id', temp_id)
                          .andWhere('a.posted', 0)
                          .count('* as total')
        return row[0].total
    }

    /**
     * count lahat ng item ng dispatch na posted or hindi pa posted
     * @param {int} temp_id 
    */
    async count_total_all_sku_dispatch(temp_id) {
        let row = await Db.joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('a.id', temp_id)
                          .groupBy('b.prod_id')
        return row.length
    }

     /**
     * total lahat ng item or sku na hindi pa posted sa p.o
     * @param {int} temp_id 
    */
    async sum_total_qty_scanned_dispatch(temp_id) {
        let row = await Db.joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('a.id', temp_id)
                          .sum('b.qty as qty')
        return (row[0].qty == null) ? 0 : row[0].qty
    }
    /**
     * @param {int} transfer_no 
    */
    async fetch_transfer_items_dispatch(transfer_no) {
        let row = await Db.connection('transfers')
                        .select('transfer_id', 'description', 'qty_out', 'uom', 'stock_id_2',  'stock_id')
                        .from('0_transfer_details')
                        .where('transfer_id', transfer_no)  
                        .orderBy('description', 'ASC')
        return row
    }
    /**
     * count item temporary using lenght of array return value
     * @param {int} temp_id 
     * @param {int} transfer_no 
     */
    async counts_items(temp_id, transfer_no) {
        let row = await Db.select('temp_receiving_id')
                          .joinRaw('FROM 0_dispatch_transfer a INNER JOIN 0_dispatch_transfer_details b ON a.id = b.temp_receiving_id')
                          .where('a.transfer_id', transfer_no)
                          .andWhere('temp_receiving_id', temp_id)
        return row.length
    }

    /**
     * delete header item
     * @param {int} temp_id 
     * @param {string} transfer_id 
     */
    async delete_header_items(temp_id, transfer_id) {
        let res = await Db.table('0_dispatch_transfer')
                          .where('transfer_id', transfer_id)
                          .andWhere('id', temp_id)
                          .delete()
        return res
    }

    /**
     * delete items 0_dispatch_transfer_details
     * @param {int} id 
     */
    async delete_items(id) {
        let res = await Db.table('0_dispatch_transfer_details')
                        .where('id', id)
                        .delete()
        return res
    }

    /**
     * @param {int} temp_id 
     */
    async fetch_dispatch_product_id(temp_id) {
        let row = await Db.select('prod_id')
                          .from('0_dispatch_transfer_details')
                          .where('temp_receiving_id', temp_id)
        return (row.length == 0) ? 0 : row
    }

    /**
     * @param {int} temp_id 
    */
   async fetch_temporary_items(temp_id) {
        let row = await Db.from('0_dispatch_transfer_details')
                          .where('temp_receiving_id', temp_id)
        return row
    }

    /**
     * 
     * @param {int} movement_no 
     * @param {object} details // mvement header data 
     * @param {object} srspos rollback 
     */
    async add_receiving_movement(movement_no, details, srspos) {
        let today = moment().format(TO_DATE) + ' 00:00:00'
        let data = {
            movementno : movement_no.toString(),
            movementcode: 'STO',
            referenceno: '',
            sourceinvoiceno:  '',
            sourcedrno:  '',
            todescription: details.to_description,
            toaddress: '',
            contactperson: '',
            fromdescription: details.from_description,
            fromaddress: '',
            datecreated: today,
            lastmodifiedby: details.user_id.toString(),
            lastdatemodified: today,
            status: details.stats.toString(),
            postedby: details.user_id.toString(),
            posteddate: today,
            terms: '0',
            transactiondate: today,
            fieldstylecode1: null,
            nettotal: details.net_total.toString(),
            statusdescription: 'POSTED',
            totalqty: details.total_qty.toString(),
            createdby: details.user_id.toString(),
            remarks: '',
            customercode: null,
            vendorcode: null,
            branchcode: null,
            cashdiscount: '',
            fieldStylecode: null,
            tobranchcode: '',
            fieldStylecode: '',
            tobranchcode: '',
            frbranchcode: '',
            sourcemovementno: '',
            countered: '0',
            transmitted: '0',
            WithPayable: '0',
            WithReceivable: '0',
            OtherExpenses: '0',
            ForexRate: '1',
            ForexCurrency: 'PHP',
            SalesmanID: '0',
            RECEIVEDBY: '',
        }

        await srspos.insert(data)
                    .into('movements')
        
        let row = await srspos.raw(`SELECT IDENT_CURRENT('movements') as last_id`)
        return row[0].last_id
    }

    /**
     * @param {string} code 
     */
    async fetch_aria_db(code) {
        let row = await Db.connection('transfers')
                          .select('aria_db')
                          .from('0_branches')
                          .where('code', code)
        return row[0].aria_db
    }

    /**
     * @param {string} code 
     */
    async fetch_gl_stock_to(brcode) {
        let row = await Db.connection('transfers')
                          .select('gl_stock_from')
                          .from('0_branches')
                          .where('code', brcode)
        return row[0].gl_stock_from
    }
    /**
     * @param {object} srs_transfers rollback
     * @param {string} aria_db 
     * @param {int} m_type 
     * @param {int} transfer_id 
     * @param {float} debit_account 
     * @param {float} net_of_vat_total 
     */
    async add_gl_trans(srs_transfers, aria_db, m_type, transfer_id, account, net_of_vat_total) {
            let data = {
                type: m_type,
                type_no: transfer_id,
                tran_date: moment().format(TO_DATE),
                account: account,
                dimension_id: 0,
                dimension2_id: 0,
                memo_: '',
                amount: net_of_vat_total,
            }
    
            await srs_transfers.insert(data)
                               .into(`srs_aria_nova.0_gl_trans`)
        
    }

    //FOR CARAVAN ONLY
    async update_header_transfer_caravan(transfer_id, user_id, delivered_by, checked_by) {
      let data = {
        aria_type_out: 70,
        aria_trans_no_out: transfer_id,
        name_out: user_id,
        m_code_out: 'STO',
        transfer_out_date: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
        delivered_by: delivered_by,
        checked_by: checked_by,
    }

    return await await Db.connection('transfers').table('0_transfer_header')
                              .where('id', transfer_id)
                              .update(data)
    }

    async update_dispatch_transfer(transfer_id) {
        let data = {
          posted: 1,
      }

      return await await Db.connection('receiving_new').table('0_dispatch_transfer')
                                .where('transfer_id', transfer_id)
                                .update(data)
    }

    async update_caravan_transfer_dispatch(transfer_id) {
      let row = await Db.connection('receiving_new')
          .select('id')
          .from('0_dispatch_transfer')
          .where('transfer_id', transfer_id)
      
      let rows = await Db.connection('receiving_new')
          .select('*')
          .from('0_dispatch_transfer_details')
          .where('temp_receiving_id', row[0].id)
          .on('query', console.log)

      for(const item of rows) {
        // let cost = Math.round(parseFloat(row.unit_cost) * parseFloat(row.pack))
        let data = {
            actual_qty_out: item.qty,
            // cost: cost.toFixed(4),
        }
        console.log(item)
        await  Db.connection('transfers')
                .from('0_transfer_details')
                .where('transfer_id', transfer_id)
                .andWhere('stock_id', item.prod_id)
                .andWhere('uom', item.uom)
                .update(data)
                .on('query', console.log)
      }
      return true
    }
    // END CARAVAN

    /**
     * @param {boject} srs_transfers rollback
     * @param {int} user_id 
     * @param {int} movement_id 
     * @param {int} transfer_id 
     * @param {string} delivered_by 
     * @param {string} checked_by 
     */
    async update_header_transfer(srs_transfers, user_id, movement_id, movement_no, transfer_id, delivered_by, checked_by) {
        let data = {
            aria_type_out: 70,
            aria_trans_no_out: transfer_id,
            name_out: user_id,
            m_id_out: movement_id,
            m_no_out: movement_no,
            m_code_out: 'STO',
            transfer_out_date: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
            delivered_by: delivered_by,
            checked_by: checked_by,
        }

        return await srs_transfers.table('0_transfer_header')
                                  .where('id', transfer_id)
                                  .update(data)
    }
    /**
     * @param {int} movement_id 
     * @param {object} row 
     * @param {int} unit_cost 
     * @param {int} qty 
     * @param {object} srspos rollback 
     */
    async add_receiving_movement_line(movement_id, row, unit_cost, qty, srspos) {
        let cost = parseFloat(unit_cost) * parseFloat(qty)
        let pack = row.pack
        let barcode = row.barcode
        let data = {
            MovementID: movement_id.toString(),
            ProductID: row.productid.toString(),
            ProductCode: row.productcode.toString(),
            Description: row.description.replace(/'/g,""),
            uom: row.uom,
            unitcost: unit_cost.toString(),
            qty: `${Math.abs(qty)}`,
            extended: `${cost.toFixed(4)}`,
            pack: pack.toString(),
            barcode: barcode.toString()
        }
       
        return await srspos.insert(data)
                           .into('movementline')
        
    }
    /**
     * @param {*} srspos 
     * @param {int} movement_id 
     * @param {int} movement_no 
     * @param {float} selling_area_in 
     * @param {float} selling_area_out 
     * @param {string} description 
     * @param {oject} row 
     */

    async add_product_history_receiving(srspos, movement_id, movement_no, selling_area_in, selling_area_out, description, user_id, row){
        let data = {
            productid : row.productid.toString(),
            barcode: row.barcode.toString(),
            transactionid: movement_id.toString(),
            transactionno: movement_no.toString(),
            dateposted: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
            transactiondate: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
            description: description,
            beginningsellingarea: row.selling_area_qty.toString(),
            beginningstockroom: null,
            flowstockroom: '0',
            flowsellingarea: '1',
            sellingareain: selling_area_in,
            sellingareaout: selling_area_out,
            stockroomin: null,
            stockroomout: null,
            unitcost: row.unit_cost.toString(),
            damagedin: null,
            damagedout: null,
            layawayin: null,
            layawayout: null,
            onrequestin: null,
            onrequestout: null,
            postedby: user_id,
            datedeleted: null,
            deletedby: null,
            movementcode: 'STO',
            terminalno: null,
            lotno: 0,
            expirationdate: null,
            SHAREWITHBRANCH: 0,
            CANCELLED:0,
            CANCELLEDBY: '',
            BeginningDamaged: null,
            FlowDamaged: null
        }
        await srspos.insert(data)
                    .into('producthistory')
        return true
    }
    /**
     * @param {object} srs_transfers rollback
     * @param {int} transfer_id 
     * @param {object} row 
     */
    async update_transfer_details(srs_transfers, transfer_id, row) {
        let cost = Math.round(parseFloat(row.unit_cost) * parseFloat(row.pack))
        let data = {
            actual_qty_out: row.qty,
            cost: cost.toFixed(4),
        }

        await srs_transfers.table('0_transfer_details')
                           .where('transfer_id', transfer_id)
                           .andWhere('stock_id', row.productid)
                           .andWhere('uom', row.uom)
                           .update(data)
    }
    /**
     * 
     * @param {int} qty_per_pcs 
     * @param {int} prod_id 
     */
    async update_product_selling_area(srspos, qty_per_pcs, row) {
        let data = {
            sellingarea: parseFloat(row.selling_area_qty) - parseFloat(qty_per_pcs)
        }
        await srspos.table('products')
                    .where('productid', row.productid)
                    .update(data)
    }
    /**
     * @param {object} srspos rollback
     * @param {object} srs_transfers rollback
     * @param {int} movement_id 
     * @param {int} movement_no 
     * @param {int} transfer_id 
     * @param {int} user_id 
     * @param {object} row 
     */
    async add_adjustment_movement_line(srspos, srs_transfers , movement_id, movement_no, transfer_id, user_id, row) {
        try {
            let unit_cost = parseFloat(row.unit_cost) * parseFloat(row.pack)
            let qty       = parseFloat(row.qty)

            let qty_per_pcs = parseFloat(row.qty) * parseFloat(row.pack)
            let barcode     = row.barcode

            if (qty < 0) {
                qty = 0
            }

            await this.add_receiving_movement_line(movement_id, row, unit_cost, qty, srspos)

            let movement_types = await PosMod.fetch_movement_types(srspos, 'STO')
            if (movement_types == "") {
                await srspos.rollback()
                await srs_transfers.rollback()
                return false
            }

            let description      = movement_types.description
            let selling_area_in  = null
            let selling_area_out = qty_per_pcs

            await this.add_product_history_receiving(srspos, movement_id, movement_no, selling_area_in, selling_area_out, description, user_id, row)
            await this.update_transfer_details(srs_transfers, transfer_id, row)
            await this.update_product_selling_area(srspos, qty_per_pcs, row)
            return true
        } catch (err) {
            console.log(err.toString())
            return false
        }
        
    }

    async post_receiving(temp_id, user_id, checked_by, delivered_by, transfer_id, selling_area_negative=null) {
        let srspos = await Db.connection('srspos').beginTransaction()
        let srs_transfers = await Db.connection('transfers').beginTransaction()

        try {
            let transfer = await this.fetch_transfer_header(transfer_id)
            //RECEIVING
            let unit_cost     = 0
            let total_qty     = 0
            let net_total = 0 
            let temp_item_re  = []
            let product       
            let gmovement_no = await PosMod.fetch_counter(srspos, 'STO')
            let movement_no  = leftPad(gmovement_no, 10, 0)
            let from_description  =  `SAN ROQUE SUPERMARKET ` + transfer.br_code_out
            let to_description    =  `SAN ROQUE SUPERMARKET ` + transfer.br_code_in
            let to_address        = ""
            let contact_person    = ""
            let remarks           = ""
            let stats             = 2
            let movement_status   = "POSTED"

            let temporary_items_list = await this.fetch_temporary_items(temp_id)
            for(const row of temporary_items_list) {
                let barcode   = row.barcode
                let pos_prod  = await PosMod.fetch_pos_product({ barcode }, 'qty, productid, productcode, description, uom')
                let productid = pos_prod[0].productid
                    product   = await PosMod.fetch_products(srspos, productid)
                    unit_cost = product.costofsales
                let selling_area_qty = product.sellingarea
                let selling_area_dmg = product.damaged
                let selling_areastock_room = product.stockroom

                    temp_item_re.push({
                        productid: productid,
                        productcode: pos_prod[0].productcode,
                        description: pos_prod[0].description,
                        uom: pos_prod[0].uom,
                        unit_cost: unit_cost,
                        qty: row.qty,
                        pack: pos_prod[0].qty,
                        barcode: barcode,
                        selling_area_qty: selling_area_qty,
                        selling_area_dmg: selling_area_dmg,
                        selling_areastock_room: selling_areastock_room,
                        user_id: user_id
                    })

                    total_qty += row.qty
                    net_total += parseFloat(unit_cost) * parseFloat(row.qty) * parseFloat(pos_prod[0].qty)
            }

            let movement_details = {
                from_description, 
                to_description, 
                stats, 
                movement_status, 
                net_total, 
                total_qty,
                user_id
            }

            let movement_id      = await this.add_receiving_movement(movement_no, movement_details, srspos)
            let m_type           = 70
            let debit_account    = 1450051
            let credit_account   = 570002
            let aria_db          = await this.fetch_aria_db(transfer.branch_in)
            let net_of_vat_total = net_total
            let tax_rate         = 12

                debit_account    = await this.fetch_gl_stock_to(transfer.branch_in)
            
            if (product.pvatable) {
                net_of_vat_total = (net_of_vat_total / (1+ (tax_rate/ 100 )))
            }

            // await this.add_gl_trans(srs_transfers, aria_db, m_type, transfer_id, debit_account, net_of_vat_total)
            // await this.add_gl_trans(srs_transfers, aria_db, m_type, transfer_id, credit_account, -net_of_vat_total)

            await this.update_header_transfer(srs_transfers, user_id, movement_id, movement_no, transfer_id, delivered_by, checked_by)

            for (const row of temp_item_re) {
                let result = await this.add_adjustment_movement_line(srspos, srs_transfers, movement_id, movement_no, transfer_id, user_id, row)
                if (!result) {
                    srs_transfers.rollback()
                    srspos.rollback()
                    throw new Error('Error')
                }
            }
            await srspos.commit()
            await srs_transfers.commit()
            return true
        } catch (error) {
            console.log(error)
            await srspos.rollback()
            await srs_transfers.rollback()
            throw new Error(error.toString())
        }
    }
}
module.exports = new TransferDispatch
