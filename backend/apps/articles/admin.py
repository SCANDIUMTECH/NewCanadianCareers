"""
Django admin registration for the articles app.
"""
from django.contrib import admin

from .models import Article, ArticleCategory, ArticleView


@admin.register(ArticleCategory)
class ArticleCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'sort_order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['sort_order', 'name']


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'author', 'category', 'status', 'featured',
        'selected_template', 'views', 'published_at',
    ]
    list_filter = ['status', 'featured', 'selected_template', 'category']
    search_fields = ['title', 'excerpt', 'content']
    prepopulated_fields = {'slug': ('title',)}
    ordering = ['-created_at']
    date_hierarchy = 'published_at'
    fieldsets = (
        ('Basic Info', {'fields': ('title', 'slug', 'author', 'category', 'tags')}),
        ('Content', {'fields': ('excerpt', 'content', 'cover_image', 'og_image')}),
        ('Display', {'fields': ('selected_template', 'featured')}),
        ('Status', {'fields': ('status', 'published_at', 'scheduled_publish_at')}),
        ('Commercial', {'fields': ('allow_inline_banners', 'affiliate_disclosure', 'sponsored_by')}),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'canonical_url'),
            'classes': ('collapse',),
        }),
        ('Metrics', {
            'fields': ('views', 'unique_views', 'reading_time'),
            'classes': ('collapse',),
        }),
        ('Preview', {
            'fields': ('preview_token', 'preview_expires_at'),
            'classes': ('collapse',),
        }),
    )
    readonly_fields = ['views', 'unique_views', 'reading_time', 'preview_token']


@admin.register(ArticleView)
class ArticleViewAdmin(admin.ModelAdmin):
    list_display = ['article', 'visitor_id', 'user', 'ip_address', 'created_at']
    list_filter = ['created_at']
    search_fields = ['article__title', 'visitor_id', 'ip_address']
    ordering = ['-created_at']
