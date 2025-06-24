document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Debug: Log cart data on page load
    console.log('Cart loaded:', cart);
    console.log('Cart total items:', cart.reduce((sum, item) => sum + item.quantity, 0));
    console.log('Cart subtotal:', cart.reduce((sum, item) => sum + item.price * item.quantity, 0));

    function updateCartCount() {
        const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('#cart-count').forEach(el => el.textContent = cartCount);
    }

    function updateCartDisplay() {
        const cartItems = document.getElementById('cart-items');
        const checkoutCartItems = document.getElementById('checkout-cart-items');
        const subtotalEl = document.querySelectorAll('#cart-subtotal');
        const shippingEl = document.querySelectorAll('#cart-shipping');
        const totalEl = document.querySelectorAll('#cart-total');

        // Calculate totals
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.price * item.quantity;
        });
        const shipping = subtotal > 1000 ? 0 : 40;
        const total = subtotal + shipping;

        // Update cart page display
        if (cartItems) {
            cartItems.innerHTML = '';
            cart.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-info">
                        <img src="${item.image || 'static/img/placeholder.jpg'}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price">₹${item.price}</div>
                        </div>
                    </div>
                    <div class="cart-item-controls">
                        <input type="number" min="1" class="quantity" data-id="${item.id}" value="${item.quantity}">
                        <span>₹${item.price * item.quantity}</span>
                        <button class="remove-item" data-id="${item.id}">Remove</button>
                    </div>
                `;
                cartItems.appendChild(itemEl);
            });
        }

        // Update checkout page display
        if (checkoutCartItems) {
            checkoutCartItems.innerHTML = '';
            if (cart.length === 0) {
                checkoutCartItems.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">Your cart is empty. Please add some items before checkout.</p>';
            } else {
                cart.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'cart-item';
                    itemEl.innerHTML = `
                        <div class="cart-item-info">
                            <img src="${item.image || 'static/img/placeholder.jpg'}" alt="${item.name}" class="cart-item-image">
                            <div class="cart-item-details">
                                <div class="cart-item-name">${item.name}</div>
                                <div class="cart-item-price">₹${item.price}</div>
                            </div>
                        </div>
                        <div class="cart-item-controls">
                            <span>Qty: ${item.quantity}</span>
                            <span>₹${item.price * item.quantity}</span>
                        </div>
                    `;
                    checkoutCartItems.appendChild(itemEl);
                });
            }
        }

        // Update all total elements
        subtotalEl.forEach(el => el.textContent = subtotal);
        shippingEl.forEach(el => el.textContent = shipping);
        totalEl.forEach(el => el.textContent = total);
    }

    // Add to Cart
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const name = btn.dataset.name;
            const price = parseFloat(btn.dataset.price);
            const image = btn.closest('.product-item').querySelector('img').src;
            const existingItem = cart.find(item => item.id === id);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ id, name, price, image, quantity: 1 });
            }

            localStorage.setItem("cart", JSON.stringify(cart));
            updateCartDisplay();
            updateCartCount();
            
            // Show success message
            const originalText = btn.textContent;
            btn.textContent = 'Added!';
            btn.style.background = 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
            }, 1000);

            gtag('event', 'add_to_cart', {
                'event_category': 'Ecommerce',
                'event_label': name,
                'value': price
            });
        });
    });

    // Update Quantity
    document.addEventListener('change', e => {
        if (e.target.classList.contains('quantity')) {
            const id = parseInt(e.target.dataset.id);
            const quantity = parseInt(e.target.value);
            const item = cart.find(item => item.id === id);

            if (item && quantity > 0) {
                item.quantity = quantity;
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
                updateCartCount();
            }
        }
    });

    // Remove Item
    document.addEventListener('click', e => {
        if (e.target.classList.contains('remove-item')) {
            const id = parseInt(e.target.dataset.id);
            cart = cart.filter(item => item.id !== id);
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
            updateCartCount();
        }
    });

    // Place Order and Generate PDF
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            // Show loading state
            const originalText = placeOrderBtn.textContent;
            placeOrderBtn.textContent = 'Generating PDF...';
            placeOrderBtn.disabled = true;
            placeOrderBtn.style.opacity = '0.7';
            
            // Validate required fields
            const name = document.getElementById('name').value.trim();
            const address = document.getElementById('address').value.trim();
            const phone = document.getElementById('phone').value.trim();
            
            if (!name || !address || !phone) {
                alert('Please fill in all required fields (Name, Address, Phone) before placing your order.');
                // Reset button state
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
                placeOrderBtn.style.opacity = '1';
                return;
            }
            
            if (cart.length === 0) {
                alert('Your cart is empty. Please add some items before placing an order.');
                // Reset button state
                placeOrderBtn.textContent = originalText;
                placeOrderBtn.disabled = false;
                placeOrderBtn.style.opacity = '1';
                return;
            }

            // Use setTimeout to allow the loading state to show
            setTimeout(() => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    
                    // --- Add Logo ---
                    // Use the logo.jpg as a base64 PNG
                    const logoDataURI = 'static/img/logo.jpg';
                    doc.addImage(logoDataURI, 'JPEG', 80, 8, 50, 16);
                    // --- End Logo ---
                    
                    // Calculate totals
                    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
                    const shipping = subtotal > 1000 ? 0 : 40;
                    const total = subtotal + shipping;
                    const orderNumber = 'HOY-' + Date.now();
                    const orderDate = new Date().toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

                    // Set up fonts and styles
                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(44, 62, 80); // Dark blue color
                    
                    doc.setFontSize(14);
                    doc.text('Order Confirmation', 105, 30, { align: 'center' });
                    
                    // Order details section
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Order Information', 20, 50);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text(`Order Number: ${orderNumber}`, 20, 60);
                    doc.text(`Order Date: ${orderDate}`, 20, 70);
                    doc.text(`Payment Method: ${paymentMethod}`, 20, 80);
                    
                    // Customer details section
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text('Customer Details', 20, 100);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text(`Name: ${name}`, 20, 110);
                    doc.text(`Address: ${address}`, 20, 120);
                    doc.text(`Phone: ${phone}`, 20, 130);
                    
                    // Store details
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text('Store Details', 20, 150);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text('Hooked On You', 20, 160);
                    doc.text('J 5/6, Sugar Apartment, Coimbatore', 20, 170);
                    doc.text('Email: hookedonyou@gmail.com', 20, 180);
                    doc.text('UPI: hookedonyou@okicici', 20, 190);
                    
                    // Order items section
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text('Order Items', 20, 210);
                    
                    // Table header
                    doc.setFillColor(52, 152, 219); // Blue background
                    doc.rect(20, 220, 170, 8, 'F');
                    doc.setTextColor(255, 255, 255); // White text
                    doc.setFontSize(9);
                    doc.text('Item', 25, 226);
                    doc.text('Qty', 100, 226);
                    doc.text('Price', 130, 226);
                    doc.text('Total', 160, 226);
                    
                    // Reset text color
                    doc.setTextColor(44, 62, 80);
                    
                    // Order items
                    let yPos = 235;
                    cart.forEach((item, index) => {
                        if (yPos > 250) { // Check if we need a new page
                            doc.addPage();
                            yPos = 20;
                        }
                        
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.text(item.name, 25, yPos);
                        doc.text(item.quantity.toString(), 100, yPos);
                        doc.text(`₹${item.price}`, 130, yPos);
                        doc.text(`₹${item.price * item.quantity}`, 160, yPos);
                        
                        yPos += 8;
                    });
                    
                    // Summary section
                    yPos += 10;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text('Order Summary', 20, yPos);
                    
                    yPos += 10;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Subtotal: ₹${subtotal}`, 120, yPos);
                    
                    yPos += 8;
                    doc.text(`Shipping: ₹${shipping}`, 120, yPos);
                    
                    yPos += 8;
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(52, 152, 219); // Blue color for total
                    doc.text(`Total: ₹${total}`, 120, yPos);
                    
                    // Terms and conditions
                    yPos += 20;
                    doc.setTextColor(44, 62, 80);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text('Terms & Conditions:', 20, yPos);
                    
                    yPos += 8;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text('• Delivery: 10-12 working days', 20, yPos);
                    yPos += 5;
                    doc.text('• Free shipping on orders above ₹1000', 20, yPos);
                    yPos += 5;
                    doc.text('• Payment: Cash on Delivery or UPI', 20, yPos);
                    yPos += 5;
                    doc.text('• Returns: 7 days from delivery date', 20, yPos);
                    yPos += 5;
                    doc.text('• Contact: hookedonyou@gmail.com', 20, yPos);
                    
                    // Footer
                    yPos += 15;
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(8);
                    doc.setTextColor(128, 128, 128);
                    doc.text('Thank you for choosing Hooked On You!', 105, yPos, { align: 'center' });
                    yPos += 5;
                    doc.text('Handcrafted with love in Coimbatore', 105, yPos, { align: 'center' });

                    // Save the PDF
                    doc.save(`order_confirmation_${orderNumber}.pdf`);

                    // Track the purchase event
                    gtag('event', 'purchase', {
                        'event_category': 'Ecommerce',
                        'event_label': 'Order',
                        'value': total,
                        'transaction_id': orderNumber
                    });

                    // Show success message
                    alert(`Order placed successfully!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${total}\n\nYour order confirmation has been downloaded as a PDF.`);
                    
                    // Clear cart and redirect
                    cart = [];
                    localStorage.setItem('cart', JSON.stringify(cart));
                    updateCartDisplay();
                    updateCartCount();
                    
                    // Redirect to home page after a short delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('There was an error generating your order confirmation. Please try again.');
                    
                    // Reset button state
                    placeOrderBtn.textContent = originalText;
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.style.opacity = '1';
                }
            }, 500); // Small delay to show loading state
        });
    }

    // Track CTA Buttons
    document.querySelectorAll('.cta-button').forEach(button => {
        button.addEventListener('click', () => {
            gtag('event', 'click', {
                'event_category': 'CTA',
                'event_label': button.textContent
            });
        });
    });

    // Track Scroll Depth
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > 50) {
            gtag('event', 'scroll', {
                'event_category': 'Engagement',
                'event_label': '50% Scroll'
            });
        }
    }, { once: true });

    updateCartCount();
    updateCartDisplay();
    
    // Check if user is on checkout page with empty cart
    if (window.location.pathname.includes('checkout.html') && cart.length === 0) {
        alert('Your cart is empty. Redirecting to cart page...');
        window.location.href = 'cart.html';
    }
});