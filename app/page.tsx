// app/page.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  Settings2, 
  Search,
  SlidersHorizontal,
  FilePlus
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useToast } from "@/hooks/use-toast"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  notes: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
}

interface Settings {
  currency: string
  taxRate: number
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
}

export default function InvoicePage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [settings, setSettings] = useState<Settings>({
    currency: 'USD',
    taxRate: 0,
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: ''
  })
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>({
    id: '',
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    notes: '',
    status: 'draft'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Invoice['status'] | 'all'>('all')

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      rate: 0
    }
    setCurrentInvoice({
      ...currentInvoice,
      items: [...currentInvoice.items, newItem]
    })
  }

  const removeInvoiceItem = (id: string) => {
    setCurrentInvoice({
      ...currentInvoice,
      items: currentInvoice.items.filter(item => item.id !== id)
    })
  }

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrentInvoice({
      ...currentInvoice,
      items: currentInvoice.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    })
  }

  const calculateSubtotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * (settings.taxRate / 100)
  }

  const calculateTotal = (items: InvoiceItem[]) => {
    const subtotal = calculateSubtotal(items)
    const tax = calculateTax(subtotal)
    return subtotal + tax
  }

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text('INVOICE', 105, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.text(settings.companyName, 20, 40)
    doc.text(settings.companyAddress, 20, 45)
    doc.text(settings.companyEmail, 20, 50)
    doc.text(settings.companyPhone, 20, 55)
    
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 40)
    doc.text(`Date: ${invoice.date}`, 140, 45)
    doc.text(`Due Date: ${invoice.dueDate}`, 140, 50)
    
    doc.text('Bill To:', 20, 70)
    doc.setFontSize(12)
    doc.text(invoice.customerName, 20, 75)
    
    const tableData = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      `${settings.currency} ${item.rate.toFixed(2)}`,
      `${settings.currency} ${(item.quantity * item.rate).toFixed(2)}`
    ])
    
    const subtotal = calculateSubtotal(invoice.items)
    const tax = calculateTax(subtotal)
    const total = subtotal + tax

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      foot: [
        ['', '', 'Subtotal:', `${settings.currency} ${subtotal.toFixed(2)}`],
        ['', '', `Tax (${settings.taxRate}%):`, `${settings.currency} ${tax.toFixed(2)}`],
        ['', '', 'Total:', `${settings.currency} ${total.toFixed(2)}`]
      ]
    })
    
    if (invoice.notes) {
      const finalY = (doc as any).lastAutoTable.finalY + 20
      doc.text('Notes:', 20, finalY)
      doc.setFontSize(10)
      doc.text(invoice.notes, 20, finalY + 5)
    }
    
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
  }

  const saveInvoice = () => {
    if (!currentInvoice.customerName) {
      toast({
        title: "Error",
        description: "Please enter a customer name",
        variant: "destructive",
      })
      return
    }

    if (currentInvoice.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      })
      return
    }

    const newInvoice = {
      ...currentInvoice,
      id: Math.random().toString(36).substr(2, 9)
    }
    setInvoices([...invoices, newInvoice])
    setCurrentInvoice({
      id: '',
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 2).padStart(3, '0')}`,
      customerName: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      notes: '',
      status: 'draft'
    })

    toast({
      title: "Success",
      description: "Invoice saved successfully",
    })
  }

  const filteredInvoices = invoices
    .filter(invoice => 
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(invoice => filterStatus === 'all' ? true : invoice.status === filterStatus)

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-200 text-gray-800'
      case 'sent': return 'bg-blue-200 text-blue-800'
      case 'paid': return 'bg-green-200 text-green-800'
      case 'overdue': return 'bg-red-200 text-red-800'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold">Invoice Manager</h1>
              <a 
                href="https://www.producthunt.com/posts/quickinvoice?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-quickinvoice" 
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:block transition-transform hover:scale-105"
              >
                <img 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=590273&theme=light" 
                  alt="QuickInvoice - Create unlimited free invoices | Product Hunt" 
                  width="250" 
                  height="54" 
                  style={{ width: '250px', height: '54px' }}
                  className="hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings2 className="h-[1.2rem] w-[1.2rem]" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Settings</SheetTitle>
                          <SheetDescription>
                            Customize your invoice settings
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                              value={settings.companyName}
                              onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company Address</Label>
                            <Textarea
                              value={settings.companyAddress}
                              onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company Email</Label>
                            <Input
                              type="email"
                              value={settings.companyEmail}
                              onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company Phone</Label>
                            <Input
                              value={settings.companyPhone}
                              onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                              value={settings.currency}
                              onValueChange={(value) => setSettings({...settings, currency: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tax Rate (%)</Label>
                            <Input
                              type="number"
                              value={settings.taxRate}
                              onChange={(e) => setSettings({...settings, taxRate: Number(e.target.value)})}
                            />
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Invoice Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Create Invoice</CardTitle>
                <Button onClick={saveInvoice}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Save Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
              >
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={currentInvoice.invoiceNumber}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={currentInvoice.customerName}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, customerName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentInvoice.date}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={currentInvoice.dueDate}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, dueDate: e.target.value})}
                  />
                </div>
              </motion.div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Items</Label>
                  <Button onClick={addInvoiceItem} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <AnimatePresence>
                  {currentInvoice.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="grid grid-cols-12 gap-4 items-center"
                    >
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => updateInvoiceItem(item.id, 'rate', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        {settings.currency} {(item.quantity * item.rate).toFixed(2)}
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInvoiceItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {currentInvoice.items.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-end space-y-2">
                      <div className="w-48 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{settings.currency} {calculateSubtotal(currentInvoice.items).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({settings.taxRate}%):</span>
                          <span>{settings.currency} {calculateTax(calculateSubtotal(currentInvoice.items)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2">
                          <span>Total:</span>
                          <span>{settings.currency} {calculateTotal(currentInvoice.items).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-6">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={currentInvoice.notes}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, notes: e.target.value})}
                    placeholder="Add any additional notes or payment terms..."
                    className="h-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {invoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <CardTitle>Invoices</CardTitle>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={filterStatus}
                      onValueChange={(value: Invoice['status'] | 'all') => setFilterStatus(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredInvoices.map((invoice, index) => (
                      <motion.div
                        key={invoice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{invoice.customerName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{invoice.invoiceNumber}</span>
                            <span>•</span>
                            <span>{invoice.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                          <span className="font-bold">
                            {settings.currency} {calculateTotal(invoice.items).toFixed(2)}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generatePDF(invoice)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download PDF</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  )
}